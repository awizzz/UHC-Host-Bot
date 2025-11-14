import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { database } from '../database.js';
import { config } from '../config.js';
import { getGuildConfig } from '../services/guildConfig.js';

export const data = new SlashCommandBuilder()
  .setName('pseudo')
  .setDescription('Enregistrer ou mettre à jour votre pseudo Minecraft.')
  .addStringOption((option) =>
    option
      .setName('pseudo')
      .setDescription('Votre pseudo Minecraft')
      .setRequired(true)
      .setMaxLength(16)
      .setMinLength(3),
  );

export async function execute(interaction) {
  const minecraftPseudo = interaction.options.getString('pseudo');
  const userId = interaction.user.id;

  // Validation du pseudo Minecraft (caractères alphanumériques et underscore uniquement)
  if (!/^[a-zA-Z0-9_]+$/.test(minecraftPseudo)) {
    const locale = interaction.guildId
      ? getGuildConfig(interaction.guildId).locale || config.defaultLocale
      : config.defaultLocale;
    const errorMessage = locale.startsWith('fr')
      ? 'Le pseudo Minecraft ne peut contenir que des lettres, chiffres et underscores.'
      : 'Minecraft username can only contain letters, numbers, and underscores.';
    await interaction.reply({
      content: `⚠️ ${errorMessage}`,
      ephemeral: true,
    });
    return;
  }

  try {
    const result = database.setMinecraftPseudo(userId, minecraftPseudo);
    const locale = interaction.guildId
      ? getGuildConfig(interaction.guildId).locale || config.defaultLocale
      : config.defaultLocale;

    const embed = new EmbedBuilder()
      .setColor(0x43b581)
      .setTitle(locale.startsWith('fr') ? '✅ Pseudo Minecraft enregistré' : '✅ Minecraft username registered')
      .setDescription(
        locale.startsWith('fr')
          ? `Votre pseudo Minecraft **${minecraftPseudo}** a été enregistré avec succès.\n\nLes hosts pourront maintenant facilement vous whitelist lors des événements.`
          : `Your Minecraft username **${minecraftPseudo}** has been successfully registered.\n\nHosts will now be able to easily whitelist you during events.`,
      )
      .setFooter({
        text: locale.startsWith('fr')
          ? `Mis à jour le ${new Date(result.updated_at).toLocaleString('fr-FR')}`
          : `Updated on ${new Date(result.updated_at).toLocaleString('en-US')}`,
      })
      .setTimestamp(new Date(result.updated_at));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    const locale = interaction.guildId
      ? getGuildConfig(interaction.guildId).locale || config.defaultLocale
      : config.defaultLocale;
    const errorMessage = locale.startsWith('fr')
      ? 'Une erreur est survenue lors de l\'enregistrement de votre pseudo.'
      : 'An error occurred while registering your username.';
    await interaction.reply({
      content: `⚠️ ${errorMessage}`,
      ephemeral: true,
    });
  }
}

