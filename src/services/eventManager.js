import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { nanoid } from 'nanoid';
import { database } from '../database.js';
import { config } from '../config.js';
import { logModeration } from '../logger.js';
import { EventScheduler } from '../scheduler/eventScheduler.js';
import {
  buildDrawEmbed,
  buildEventEmbed,
  buildParticipantListEmbed,
} from '../utils/embedFactory.js';
import {
  computeAdmissionTime,
  ensureDateTime,
  ensureFuture,
  formatAbsolute,
  formatRelative,
} from '../utils/time.js';
import { canMentionEveryone } from '../utils/permissions.js';
import { getGuildConfig } from './guildConfig.js';

export function createEventManager({ client }) {
  const scheduler = new EventScheduler();

  async function createEvent(interaction, payload) {
    const {
      mentionEveryone = undefined,
      reminderMinutes = undefined,
      admissionOffset = undefined,
      ...options
    } = payload;
    if (!interaction.guildId) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Cette commande doit être utilisée sur un serveur.'
          : 'This command must be used inside a server.',
      );
    }

    const guildConfig = getGuildConfig(interaction.guildId);
    const locale = guildConfig.locale || config.defaultLocale;
    const timezone = guildConfig.timezone || config.defaultTimezone;
    const startDate = ensureFuture(options.startsAt ?? options.date, timezone);
    const admissionValue = Number.isFinite(admissionOffset)
      ? Math.max(admissionOffset, 0)
      : Math.max(guildConfig.admissionOffset ?? 0, 0);
    const admissionOpensAt = computeAdmissionTime(startDate, admissionValue);
    const admissionsAreOpen = admissionOpensAt <= ensureDateTime(new Date(), timezone);
    const reminderValue = Number.isFinite(reminderMinutes)
      ? reminderMinutes
      : guildConfig.reminderMinutes ?? config.defaultReminderMinutes;
    const mentionEveryoneFlag =
      typeof mentionEveryone === 'boolean'
        ? mentionEveryone
        : guildConfig.mentionEveryoneDefault ?? false;

    const eventId = `uhc_${nanoid(8)}`;

    const eventRecord = database.createEvent({
      id: eventId,
      title: options.title,
      description: options.description,
      slots: options.slots,
      starts_at: startDate.toISO(),
      admission_offset: admissionValue,
      admission_opens_at: admissionOpensAt.toISO(),
      admission_open: admissionsAreOpen ? 1 : 0,
      reminder_minutes: reminderValue,
      link: options.link,
      creator_id: interaction.user.id,
      creator_tag: interaction.user.tag ?? interaction.user.username,
      channel_id: interaction.channelId,
      guild_id: interaction.guildId,
      locale,
      timezone,
    });

    const components = buildActionRows(eventRecord, []);

    const canMention = mentionEveryoneFlag && canMentionEveryone(interaction);
    const content = canMention ? '@everyone' : null;

    const message = await interaction.channel.send({
      content,
      embeds: [buildEventEmbed(eventRecord, [])],
      components,
      allowedMentions: canMention ? { parse: ['everyone'] } : { parse: [] },
    });

    const updatedEvent = database.setEventMessageReference(
      eventRecord.id,
      interaction.guildId,
      message.channelId,
      message.id,
    );

    scheduler.scheduleEvent(updatedEvent);

    await logModeration({
      eventId: updatedEvent.id,
      guildId: interaction.guildId,
      userId: interaction.user.id,
      action: 'CREATE_EVENT',
      message: `Event created: **${updatedEvent.title}**`,
      metadata: {
        slots: updatedEvent.slots,
        starts_at: updatedEvent.starts_at,
        admission_offset: updatedEvent.admission_offset,
      },
    });

    return updatedEvent;
  }

  function buildActionRows(event, participants) {
    const participantCount = participants.length;
    const locale = (event.locale || config.defaultLocale).toLowerCase();
    const joinDisabled = !event.admission_open || participantCount >= event.slots;
    const cancelDisabled = !participantCount;

    const joinButton = new ButtonBuilder()
      .setCustomId(`event|join|${event.id}`)
      .setEmoji('✅')
      .setLabel(locale.startsWith('fr') ? 'Rejoindre' : 'Join')
      .setStyle(ButtonStyle.Success)
      .setDisabled(joinDisabled);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`event|cancel|${event.id}`)
      .setEmoji('❌')
      .setLabel(locale.startsWith('fr') ? 'Quitter' : 'Leave')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(cancelDisabled);

    const listButton = new ButtonBuilder()
      .setCustomId(`event|list|${event.id}`)
      .setEmoji('📋')
      .setLabel(locale.startsWith('fr') ? 'Liste' : 'List')
      .setStyle(ButtonStyle.Primary);

    const lotteryButton = new ButtonBuilder()
      .setCustomId(`event|lottery|${event.id}`)
      .setEmoji('🎲')
      .setLabel(locale.startsWith('fr') ? 'Tirage' : 'Draw')
      .setStyle(ButtonStyle.Danger);

    return [new ActionRowBuilder().addComponents(joinButton, cancelButton, listButton, lotteryButton)];
  }

  async function refreshEventMessage(eventId) {
    const event = database.getEventById(eventId);
    if (!event || !event.channel_id || !event.message_id) {
      return;
    }

    const participants = database.getParticipants(eventId);
    try {
      const channel = await client.channels.fetch(event.channel_id);
      if (!channel || channel.type !== ChannelType.GuildText) {
        return;
      }
      const message = await channel.messages.fetch(event.message_id);
      if (!message) {
        return;
      }
      await message.edit({
        embeds: [buildEventEmbed(event, participants)],
        components:
          event.status === 'ACTIVE' ? buildActionRows(event, participants) : buildDisabledComponents(),
      });
    } catch (error) {
      console.error('Failed to refresh event message:', error);
    }
  }

  function buildDisabledComponents() {
    const disabledJoin = new ButtonBuilder()
      .setCustomId('event|join|disabled')
      .setLabel('Indisponible')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
    return [new ActionRowBuilder().addComponents(disabledJoin)];
  }

  async function joinEvent(interaction, eventId) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      throw new Error(config.defaultLocale.startsWith('fr') ? "Cet événement n'existe plus." : 'Event not found.');
    }
    if (event.guild_id && event.guild_id !== interaction.guildId) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Cet événement appartient à un autre serveur.'
          : 'This event belongs to another server.',
      );
    }

    if (!event.admission_open) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? "Les inscriptions ne sont pas ouvertes."
          : 'Admissions are not open yet.',
      );
    }

    const currentParticipants = database.getParticipants(eventId);
    if (currentParticipants.length >= event.slots) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Toutes les places sont prises.'
          : 'All slots are already taken.',
      );
    }

    const existing = database.getParticipant(eventId, interaction.user.id);
    if (existing) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Vous êtes déjà inscrit.'
          : 'You are already enrolled in this event.',
      );
    }

    const updatedParticipants = database.insertParticipant(
      eventId,
      interaction.user.id,
      interaction.user.tag ?? interaction.user.username,
    );

    await refreshEventMessage(eventId);

    await logModeration({
      eventId,
      guildId: event.guild_id,
      userId: interaction.user.id,
      action: 'JOIN_EVENT',
      message: `${interaction.user.tag} joined the event.`,
      metadata: { count: updatedParticipants.length },
    });

    return updatedParticipants.length;
  }

  async function cancelParticipation(interaction, eventId) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      throw new Error(config.defaultLocale.startsWith('fr') ? 'Événement introuvable.' : 'Event not found.');
    }
    if (event.guild_id && event.guild_id !== interaction.guildId) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Cet événement appartient à un autre serveur.'
          : 'This event belongs to another server.',
      );
    }

    const existing = database.getParticipant(eventId, interaction.user.id);
    if (!existing) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? "Vous n'êtes pas inscrit."
          : 'You are not part of this event.',
      );
    }

    const participants = database.removeParticipant(eventId, interaction.user.id);
    await refreshEventMessage(eventId);

    await logModeration({
      eventId,
      guildId: event.guild_id,
      userId: interaction.user.id,
      action: 'LEAVE_EVENT',
      message: `${interaction.user.tag} left the event.`,
      metadata: { count: participants.length },
    });

    return participants.length;
  }

  async function showParticipants(eventId) {
    const event = database.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found.');
    }
    const participants = database.getParticipants(eventId);
    return buildParticipantListEmbed(event, participants);
  }

  async function runDraw(interaction, eventId, winnersCount, options = {}) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      throw new Error('Event not found or inactive.');
    }
    if (interaction?.guildId && event.guild_id && interaction.guildId !== event.guild_id) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Cet événement appartient à un autre serveur.'
          : 'This event belongs to another server.',
      );
    }

    const participants = database.getParticipants(eventId);
    if (!participants.length) {
      throw new Error('No participants to draw from.');
    }

    const totalWinners = Math.min(winnersCount || event.slots, participants.length);
    if (totalWinners <= 0) {
      throw new Error('Winner count must be greater than zero.');
    }

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, totalWinners);

    for (const winner of winners) {
      database.setParticipantAdmission(eventId, winner.user_id, true);
    }
    // Mark others as not admitted
    for (const participant of participants) {
      if (!winners.some((winner) => winner.user_id === participant.user_id)) {
        database.setParticipantAdmission(eventId, participant.user_id, false);
      }
    }

    await refreshEventMessage(eventId);

    const channel = await client.channels.fetch(event.channel_id);
    if (channel?.isTextBased()) {
      const embed = buildDrawEmbed({
        event,
        winners,
        authorTag: interaction?.user?.tag ?? options.trigger ?? 'System',
      });
      await channel.send({ embeds: [embed] });
    }

    if (!options?.silent) {
      for (const winner of winners) {
        try {
          const user = await client.users.fetch(winner.user_id);
          await user.send(
            `🎉 ${event.title} — ${
              config.defaultLocale.startsWith('fr')
                ? 'tu es sélectionné !'
                : 'you have been selected!'
            }`,
          );
        } catch {
          // Ignore DM failures
        }
      }
    }

    await logModeration({
      eventId,
      guildId: event?.guild_id ?? interaction?.guildId ?? null,
      userId: interaction?.user?.id ?? options.executor ?? client.user.id,
      action: options.auto ? 'AUTO_DRAW' : 'MANUAL_DRAW',
      message: `Draw executed with ${totalWinners} winner(s).`,
      metadata: { winners: winners.map((winner) => winner.user_id) },
    });

    return winners;
  }

  async function forceAdmissionOpen(interaction, eventId) {
    const event = database.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found.');
    }
    if (interaction.guildId && event.guild_id && interaction.guildId !== event.guild_id) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Cet événement appartient à un autre serveur.'
          : 'This event belongs to another server.',
      );
    }

    if (event.admission_open) {
      throw new Error('Admissions are already open.');
    }

    const updatedEvent = database.updateEvent(eventId, {
      admission_open: 1,
      admission_opens_at: new Date().toISOString(),
    });
    scheduler.cancelEvent(eventId);
    scheduler.scheduleEvent(updatedEvent);
    await refreshEventMessage(eventId);

    await logModeration({
      eventId,
      guildId: event.guild_id,
      userId: interaction.user.id,
      action: 'FORCE_ADMISSION',
      message: 'Admissions manually opened.',
    });

    return updatedEvent;
  }

  async function cancelEvent(interaction, eventId) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      throw new Error('Event not found or already closed.');
    }
    if (interaction.guildId && event.guild_id && interaction.guildId !== event.guild_id) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Cet événement appartient à un autre serveur.'
          : 'This event belongs to another server.',
      );
    }

    scheduler.cancelEvent(eventId);
    database.updateEventStatus(eventId, 'CANCELLED');
    await refreshEventMessage(eventId);

    const channel = await client.channels.fetch(event.channel_id);
    if (channel?.isTextBased()) {
      await channel.send(
        config.defaultLocale.startsWith('fr')
          ? `⚠️ L'événement **${event.title}** est annulé.`
          : `⚠️ Event **${event.title}** has been cancelled.`,
      );
    }

    await logModeration({
      eventId,
      guildId: event.guild_id,
      userId: interaction.user.id,
      action: 'CANCEL_EVENT',
      message: 'Event cancelled.',
    });
  }

  async function updateEvent(interaction, eventId, changes) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      throw new Error('Event not found or inactive.');
    }
    if (interaction.guildId && event.guild_id && interaction.guildId !== event.guild_id) {
      throw new Error(
        config.defaultLocale.startsWith('fr')
          ? 'Cet événement appartient à un autre serveur.'
          : 'This event belongs to another server.',
      );
    }

    const updatedFields = { ...changes };

    if (changes.starts_at) {
      const newStart = ensureFuture(changes.starts_at, event.timezone);
      updatedFields.starts_at = newStart.toISO();
      if (typeof changes.admission_offset === 'undefined') {
        updatedFields.admission_opens_at = computeAdmissionTime(
          newStart,
          event.admission_offset,
        ).toISO();
        updatedFields.admission_open = computeAdmissionTime(newStart, event.admission_offset) <=
          ensureDateTime(new Date(), event.timezone)
            ? 1
            : 0;
      }
    }

    if (typeof changes.admission_offset !== 'undefined') {
      const offset = Math.max(Number.parseInt(changes.admission_offset, 10) || 0, 0);
      updatedFields.admission_offset = offset;
      const start = ensureDateTime(updatedFields.starts_at ?? event.starts_at, event.timezone);
      updatedFields.admission_opens_at = computeAdmissionTime(start, offset).toISO();
      updatedFields.admission_open =
        computeAdmissionTime(start, offset) <= ensureDateTime(new Date(), event.timezone) ? 1 : 0;
    }

    const updatedEvent = database.updateEvent(eventId, updatedFields);
    scheduler.scheduleEvent(updatedEvent);
    await refreshEventMessage(eventId);

    await logModeration({
      eventId,
      guildId: event.guild_id,
      userId: interaction.user.id,
      action: 'EDIT_EVENT',
      message: 'Event updated.',
      metadata: updatedFields,
    });

    return updatedEvent;
  }

  async function handleAdmissionOpen(eventId) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE' || event.admission_open) {
      return;
    }

    const updatedEvent = database.updateEvent(eventId, {
      admission_open: 1,
      admission_opens_at: new Date().toISOString(),
    });
    await refreshEventMessage(eventId);

    if (updatedEvent.channel_id) {
      try {
        const channel = await client.channels.fetch(updatedEvent.channel_id);
        if (channel?.isTextBased()) {
          await channel.send(
            config.defaultLocale.startsWith('fr')
              ? `🚪 Les admissions pour **${updatedEvent.title}** sont ouvertes !`
              : `🚪 Admissions for **${updatedEvent.title}** are now open!`,
          );
        }
      } catch (error) {
        console.error('Failed to send admission message:', error);
      }
    }
  }

  async function handleReminder(eventId) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      return;
    }

    const participants = database.getParticipants(eventId);
    if (!participants.length) {
      return;
    }

    if (event.channel_id) {
      try {
        const channel = await client.channels.fetch(event.channel_id);
        if (channel?.isTextBased()) {
          await channel.send(
            config.defaultLocale.startsWith('fr')
              ? `⏰ Rappel : **${event.title}** commence <t:${Math.floor(
                  ensureDateTime(event.starts_at).toSeconds(),
                )}:R>.`
              : `⏰ Reminder: **${event.title}** starts <t:${Math.floor(
                  ensureDateTime(event.starts_at).toSeconds(),
                )}:R>.`,
          );
        }
      } catch (error) {
        console.error('Failed to send reminder message:', error);
      }
    }

    for (const participant of participants) {
      try {
        const user = await client.users.fetch(participant.user_id);
        await user.send(
          config.defaultLocale.startsWith('fr')
            ? `⏰ Rappel : **${event.title}** commence ${formatRelative(event.starts_at)} (${formatAbsolute(
                event.starts_at,
              )}).`
            : `⏰ Reminder: **${event.title}** starts ${formatRelative(event.starts_at)} (${formatAbsolute(
                event.starts_at,
              )}).`,
        );
      } catch {
        // Ignore DM failures
      }
    }

    await logModeration({
      eventId,
      guildId: event.guild_id,
      userId: client.user.id,
      action: 'REMINDER_SENT',
      message: 'Reminder dispatched to participants.',
      metadata: { count: participants.length },
    });
  }

  async function handleAutoDraw(eventId) {
    const event = database.getEventById(eventId);
    if (!event || event.status !== 'ACTIVE') {
      return;
    }
    try {
      await runDraw(null, eventId, event.slots, {
        auto: true,
        silent: false,
        executor: client.user.id,
        trigger: client.user.tag,
      });
    } catch (error) {
      console.error('Auto draw failed:', error);
    }
  }

  scheduler.bindHandlers({
    onAdmissionOpen: handleAdmissionOpen,
    onReminder: handleReminder,
    onAutoDraw: handleAutoDraw,
  });

  function rescheduleAll() {
    const events = database.listActiveEvents();
    for (const event of events) {
      scheduler.scheduleEvent(event);
    }
  }

  return {
    createEvent,
    joinEvent,
    cancelParticipation,
    showParticipants,
    runDraw,
    forceAdmissionOpen,
    cancelEvent,
    updateEvent,
    refreshEventMessage,
    rescheduleAll,
  };
}

