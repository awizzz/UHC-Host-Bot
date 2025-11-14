import { ActionRowBuilder, SlashCommandBuilder, StringSelectMenuBuilder } from 'discord.js';
import { database } from '../database.js';
import { canManageEvent } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('editevent')
  .setDescription('Modifier un événement existant.')
  .addStringOption((option) =>
    option
      .setName('eventid')
      .setDescription("Identifiant de l'événement (uhc_xxxx)")
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
      content: "Vous n'avez pas la permission de modifier cet événement.",
      ephemeral: true,
    });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`event|edit-select|${eventId}`)
    .setPlaceholder('Choisissez un champ à modifier')
    .addOptions(
      { label: 'Titre', value: 'title' },
      { label: 'Description', value: 'description' },
      { label: 'Places', value: 'slots' },
      { label: 'Date', value: 'starts_at' },
      { label: 'Lien', value: 'link' },
      { label: 'Admission offset', value: 'admission_offset' },
      { label: 'Rappel', value: 'reminder_minutes' },
    );

  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.reply({
    content: `Modification de **${event.title}** — choisissez un champ.`,
    components: [row],
    ephemeral: true,
  });
}

