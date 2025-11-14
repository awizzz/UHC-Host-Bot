import { SlashCommandBuilder } from 'discord.js';
import { database } from '../database.js';
import { canManageEvent } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('draw')
  .setDescription('Effectuer un tirage manuel.')
  .addStringOption((option) =>
    option
      .setName('eventid')
      .setDescription("Identifiant de l'événement")
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('winners')
      .setDescription('Nombre de gagnants à sélectionner')
      .setMinValue(1)
      .setMaxValue(200)
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
  const winners = interaction.options.getInteger('winners', true);

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

  if (!canManageEvent(interaction, event)) {
    await interaction.editReply({
      content: "Vous n'avez pas la permission de lancer un tirage pour cet événement.",
    });
    return;
  }

  try {
    const drawResult = await interaction.client.eventManager.runDraw(
      interaction,
      eventId,
      winners,
      { silent: false },
    );
    await interaction.editReply({
      content: `🎲 Tirage terminé. ${drawResult.length} gagnant(s).`,
    });
  } catch (error) {
    await interaction.editReply({
      content: `⚠️ ${error.message ?? 'Erreur pendant le tirage.'}`,
    });
  }
}

