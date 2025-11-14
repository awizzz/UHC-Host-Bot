import { SlashCommandBuilder } from 'discord.js';
import { database } from '../database.js';
import { canManageEvent } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('cancelevent')
  .setDescription('Annuler un événement.')
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

  const eventId = interaction.options.getString('eventid', true);
  const event = database.getEventById(eventId);

  if (!event) {
    await interaction.reply({ content: 'Événement introuvable.', ephemeral: true });
    return;
  }

  if (event.guild_id && event.guild_id !== interaction.guildId) {
    await interaction.reply({
      content: "Cet événement est géré sur un autre serveur.",
      ephemeral: true,
    });
    return;
  }

  if (!canManageEvent(interaction, event)) {
    await interaction.reply({
      content: "Vous n'avez pas la permission d'annuler cet événement.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.client.eventManager.cancelEvent(interaction, eventId);
    await interaction.reply({
      content: '⚠️ Événement annulé.',
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: `⚠️ ${error.message ?? "Impossible d'annuler cet événement."}`,
      ephemeral: true,
    });
  }
}

