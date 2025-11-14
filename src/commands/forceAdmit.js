import { SlashCommandBuilder } from 'discord.js';
import { database } from '../database.js';
import { canUseAdmin } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('forceadmit')
  .setDescription("Ouvrir immédiatement les admissions d'un événement.")
  .addStringOption((option) =>
    option
      .setName('eventid')
      .setDescription("Identifiant de l'événement")
      .setRequired(true),
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

  const eventId = interaction.options.getString('eventid', true);
  const event = database.getEventById(eventId);

  if (!event) {
    await interaction.editReply({ content: 'Événement introuvable.' });
    return;
  }

  if (event.guild_id && event.guild_id !== interaction.guildId) {
    await interaction.editReply({
      content: "Cet événement est géré sur un autre serveur.",
    });
    return;
  }

  if (!canUseAdmin(interaction)) {
    await interaction.editReply({
      content: "Vous n'avez pas la permission d'utiliser cette commande.",
    });
    return;
  }

  try {
    await interaction.client.eventManager.forceAdmissionOpen(interaction, eventId);
    await interaction.editReply({ content: '🚪 Admissions ouvertes immédiatement.' });
  } catch (error) {
    await interaction.editReply({ content: `⚠️ ${error.message ?? 'Action impossible.'}` });
  }
}

