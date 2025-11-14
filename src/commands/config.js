import { EmbedBuilder, SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { DateTime } from 'luxon';
import { getGuildConfig, updateGuildConfig } from '../services/guildConfig.js';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configurer UHC HOSTS pour ce serveur.')
  .addSubcommand((sub) =>
    sub.setName('show').setDescription('Afficher la configuration actuelle.'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Mettre à jour la configuration.')
      .addStringOption((option) =>
        option
          .setName('timezone')
          .setDescription('Fuseau horaire (ex: Europe/Paris, UTC).')
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('locale')
          .setDescription('Langue (fr ou en).')
          .setRequired(false)
          .addChoices(
            { name: 'Français', value: 'fr' },
            { name: 'English', value: 'en' },
          ),
      )
      .addIntegerOption((option) =>
        option
          .setName('reminder_minutes')
          .setDescription('Minutes avant le début pour envoyer un rappel.')
          .setMinValue(5)
          .setMaxValue(1440),
      )
      .addIntegerOption((option) =>
        option
          .setName('admission_offset')
          .setDescription('Minutes avant le début pour ouvrir les admissions.')
          .setMinValue(0)
          .setMaxValue(1440),
      )
      .addChannelOption((option) =>
        option
          .setName('log_channel')
          .setDescription('Salon où envoyer les logs du bot.')
          .addChannelTypes(ChannelType.GuildText),
      )
      .addBooleanOption((option) =>
        option
          .setName('log_channel_clear')
          .setDescription('Supprimer le salon de logs configuré.')
          .setRequired(false),
      )
      .addBooleanOption((option) =>
        option
          .setName('mention_everyone')
          .setDescription('Mentionner @everyone par défaut lors des créations.'),
      )
      .addBooleanOption((option) =>
        option
          .setName('mention_everyone_clear')
          .setDescription("Revenir au comportement par défaut pour la mention @everyone."),
      ),
  );

export async function execute(interaction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée sur un serveur.',
      ephemeral: true,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "Vous devez avoir la permission de gérer le serveur pour modifier la configuration.",
      ephemeral: true,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'show') {
    const cfg = getGuildConfig(interaction.guildId);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('⚙️ Configuration UHC HOSTS')
      .addFields(
        { name: 'Fuseau horaire', value: cfg.timezone, inline: true },
        { name: 'Langue', value: cfg.locale, inline: true },
        { name: 'Rappel (minutes)', value: String(cfg.reminderMinutes), inline: true },
        {
          name: 'Ouverture admissions (minutes)',
          value: String(cfg.admissionOffset ?? 0),
          inline: true,
        },
        {
          name: 'Mention @everyone par défaut',
          value:
            cfg.mentionEveryoneDefault === null
              ? 'Suivre la commande'
              : cfg.mentionEveryoneDefault
                ? 'Oui'
                : 'Non',
          inline: true,
        },
        {
          name: 'Salon de logs',
          value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Non défini',
          inline: true,
        },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const timezone = interaction.options.getString('timezone');
  const locale = interaction.options.getString('locale');
  const reminderMinutes = interaction.options.getInteger('reminder_minutes');
  const admissionOffset = interaction.options.getInteger('admission_offset');
  const logChannel = interaction.options.getChannel('log_channel');
  const logChannelClear = interaction.options.getBoolean('log_channel_clear');
  const mentionEveryone = interaction.options.getBoolean('mention_everyone');
  const mentionEveryoneClear = interaction.options.getBoolean('mention_everyone_clear');

  const updates = {};

  if (timezone !== null) {
    const tzCheck = DateTime.now().setZone(timezone);
    if (!tzCheck.isValid) {
      await interaction.reply({
        content: 'Fuseau horaire invalide. Exemple : Europe/Paris ou UTC.',
        ephemeral: true,
      });
      return;
    }
    updates.timezone = timezone;
  }
  if (locale !== null) {
    updates.locale = locale;
  }
  if (reminderMinutes !== null) {
    updates.reminderMinutes = reminderMinutes;
  }
  if (admissionOffset !== null) {
    updates.admissionOffset = admissionOffset;
  }
  if (logChannel !== null && logChannelClear) {
    await interaction.reply({
      content: "Choisissez soit un salon, soit l'option de suppression, mais pas les deux.",
      ephemeral: true,
    });
    return;
  }

  if (logChannel !== null) {
    updates.logChannelId = logChannel.id;
  }
  if (logChannelClear) {
    updates.logChannelId = null;
  }

  if (mentionEveryone !== null && mentionEveryoneClear) {
    await interaction.reply({
      content: "Choisissez soit une valeur pour @everyone, soit la remise à zéro, mais pas les deux.",
      ephemeral: true,
    });
    return;
  }

  if (mentionEveryone !== null) {
    updates.mentionEveryoneDefault = mentionEveryone;
  }
  if (mentionEveryoneClear) {
    updates.mentionEveryoneDefault = null;
  }

  if (!Object.keys(updates).length) {
    await interaction.reply({
      content: 'Aucun paramètre à mettre à jour.',
      ephemeral: true,
    });
    return;
  }

  try {
    const cfg = updateGuildConfig(interaction.guildId, updates);
    await interaction.reply({
      content: '✅ Configuration mise à jour.',
      embeds: [
        new EmbedBuilder()
          .setColor(0x43b581)
          .setTitle('Nouvelle configuration')
          .setDescription(
            [
              `• Fuseau horaire : ${cfg.timezone}`,
              `• Langue : ${cfg.locale}`,
              `• Rappel : ${cfg.reminderMinutes} min`,
              `• Admissions : ${cfg.admissionOffset} min avant`,
              `• Mention @everyone par défaut : ${
                cfg.mentionEveryoneDefault === null
                  ? 'Suivre la commande'
                  : cfg.mentionEveryoneDefault
                    ? 'Oui'
                    : 'Non'
              }`,
              `• Salon de logs : ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Non défini'}`,
            ].join('\n'),
          ),
      ],
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: `⚠️ ${error.message ?? 'Impossible de mettre à jour la configuration.'}`,
      ephemeral: true,
    });
  }
}

