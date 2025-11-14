import { EmbedBuilder } from 'discord.js';
import { database } from './database.js';
import { config } from './config.js';
import { getGuildConfig } from './services/guildConfig.js';

let clientInstance;

export function initializeLogger(client) {
  clientInstance = client;
}

export async function logModeration({
  eventId = null,
  guildId = null,
  userId,
  action,
  message,
  metadata = {},
}) {
  database.logModerationEntry({
    event_id: eventId,
    user_id: userId,
    action,
    message,
    metadata,
  });

  if (!clientInstance) {
    return;
  }

  try {
    const fallbackEvent = eventId ? database.getEventById(eventId) : null;
    const resolvedGuildId = guildId ?? fallbackEvent?.guild_id ?? null;

    let targetChannelId = config.logChannelId || null;

    if (resolvedGuildId) {
      const guildConfig = getGuildConfig(resolvedGuildId);
      if (!targetChannelId) {
        targetChannelId = guildConfig.logChannelId || null;
      }
    }

    if (!targetChannelId && fallbackEvent?.channel_id) {
      targetChannelId = fallbackEvent.channel_id;
    }

    if (!targetChannelId) {
      return;
    }

    const channel = await clientInstance.channels.fetch(targetChannelId);
    if (!channel || !channel.isTextBased()) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`Log • ${action}`)
      .setDescription(message)
      .addFields(
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Event', value: eventId ? `\`${eventId}\`` : 'N/A', inline: true },
      )
      .setTimestamp(new Date());

    if (metadata && Object.keys(metadata).length) {
      embed.addFields({
        name: 'Details',
        value: '```json\n' + JSON.stringify(metadata, null, 2) + '\n```',
      });
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to send moderation log:', error);
  }
}

export function logConsole(message, extra = {}) {
  const payload = { message, ...extra };
  console.log(`[UHC HOSTS] ${message}`, Object.keys(extra).length ? extra : '');
  return payload;
}

