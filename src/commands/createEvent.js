import { SlashCommandBuilder } from 'discord.js';
import { DateTime } from 'luxon';
import { config } from '../config.js';
import { getGuildConfig } from '../services/guildConfig.js';

export const data = new SlashCommandBuilder()
  .setName('createevent')
  .setDescription('Créer un nouvel événement UHC.')
  .addStringOption((option) =>
    option
      .setName('title')
      .setDescription("Titre de l'événement")
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('slots')
      .setDescription('Nombre de places disponibles')
      .setMinValue(1)
      .setMaxValue(200)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('date')
      .setDescription('Date (format 2025-01-30)')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('time')
      .setDescription('Heure (format 20:30 ou 20:30:00)')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('link')
      .setDescription('Lien vers les informations supplémentaires (optionnel)')
      .setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName('description')
      .setDescription('Description courte à afficher')
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('admission_offset')
      .setDescription(
        "Minutes avant le début où ouvrir les admissions (0 pour immédiat, défaut: configuration).",
      )
      .setMinValue(0)
      .setMaxValue(1440)
      .setRequired(false),
  )
  .addBooleanOption((option) =>
    option
      .setName('mention_everyone')
      .setDescription("Ping @everyone à la publication (si vous avez l'autorisation).")
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName('reminder_minutes')
      .setDescription('Minutes avant le début pour envoyer un rappel (défaut: config).')
      .setMinValue(5)
      .setMaxValue(1440)
      .setRequired(false),
  );

export async function execute(interaction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée sur un serveur.',
      ephemeral: true,
    });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  try {
    const title = interaction.options.getString('title', true);
    const slots = interaction.options.getInteger('slots', true);
    const dateInput = interaction.options.getString('date', true);
    const timeInput = interaction.options.getString('time', true);
    const link = interaction.options.getString('link');
    const description = interaction.options.getString('description', true);
    const guildConfig = getGuildConfig(interaction.guildId);
    const reminderMinutes =
      interaction.options.getInteger('reminder_minutes') ?? guildConfig.reminderMinutes;
    const admissionOffset =
      interaction.options.getInteger('admission_offset') ?? guildConfig.admissionOffset;
    const mentionEveryoneChoice = interaction.options.getBoolean('mention_everyone');
    const mentionEveryone =
      mentionEveryoneChoice ?? (guildConfig.mentionEveryoneDefault ?? false);

    const timezone = config.defaultTimezone;
    let parsedDate = DateTime.fromISO(`${dateInput}T${timeInput}`, { zone: timezone });
    if (!parsedDate.isValid) {
      parsedDate = DateTime.fromFormat(`${dateInput} ${timeInput}`, 'yyyy-MM-dd HH:mm', {
        zone: timezone,
      });
    }
    if (!parsedDate.isValid) {
      parsedDate = DateTime.fromFormat(`${dateInput} ${timeInput}`, 'yyyy-MM-dd HH:mm:ss', {
        zone: timezone,
      });
    }
    if (!parsedDate.isValid) {
      throw new Error(
        "Format de date invalide. Utilisez `YYYY-MM-DD` pour la date et `HH:mm` pour l'heure.",
      );
    }

    if (link && !/^https?:\/\//i.test(link)) {
      throw new Error('Le lien doit commencer par http:// ou https://');
    }

    const event = await interaction.client.eventManager.createEvent(interaction, {
      title,
      slots,
      startsAt: parsedDate,
      link: link ?? null,
      description,
      admissionOffset,
      reminderMinutes,
      mentionEveryone,
    });

    await interaction.editReply({
      content: `✅ Événement créé avec l'ID \`${event.id}\`. Début <t:${Math.floor(
        parsedDate.toSeconds(),
      )}:F>`,
    });
  } catch (error) {
    await interaction.editReply({
      content: `⚠️ ${error.message ?? 'Impossible de créer cet événement.'}`,
    });
  }
}

