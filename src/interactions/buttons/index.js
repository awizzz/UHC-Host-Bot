import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { database } from '../../database.js';
import { canManageEvent } from '../../utils/permissions.js';

export async function handleButton(interaction) {
  const [scope, action, eventId] = interaction.customId.split('|');
  if (scope !== 'event' || !eventId) {
    return;
  }

  const manager = interaction.client.eventManager;
  if (!manager) {
    await interaction.reply({ content: 'Manager unavailable.', ephemeral: true });
    return;
  }

  try {
    switch (action) {
      case 'join': {
        const total = await manager.joinEvent(interaction, eventId);
        await interaction.reply({
          content: `✅ Inscription prise en compte. Position #${total}.`,
          ephemeral: true,
        });
        break;
      }
      case 'cancel': {
        await manager.cancelParticipation(interaction, eventId);
        await interaction.reply({
          content: '❌ Votre inscription est annulée.',
          ephemeral: true,
        });
        break;
      }
      case 'list': {
        const result = await manager.showParticipants(eventId);
        if (result.file) {
          await interaction.reply({
            embeds: [result.embed],
            files: [result.file],
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            embeds: [result.embed],
            ephemeral: true,
          });
        }
        break;
      }
      case 'lottery': {
        const event = database.getEventById(eventId);
        if (!event) {
          await interaction.reply({ content: 'Événement introuvable.', ephemeral: true });
          return;
        }

        if (!canManageEvent(interaction, event)) {
          await interaction.reply({
            content: "Vous n'avez pas la permission de lancer un tirage.",
            ephemeral: true,
          });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`event|lotteryModal|${eventId}`)
          .setTitle('🎲 Tirage manuel');

        const winnersInput = new TextInputBuilder()
          .setCustomId('winners')
          .setLabel('Nombre de gagnants')
          .setPlaceholder(String(event.slots))
          .setRequired(false)
          .setStyle(TextInputStyle.Short);

        const row = new ActionRowBuilder().addComponents(winnersInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
        break;
      }
      default:
        await interaction.reply({ content: 'Action inconnue.', ephemeral: true });
        break;
    }
  } catch (error) {
    await interaction.reply({
      content: `⚠️ ${error.message ?? 'Erreur inattendue.'}`,
      ephemeral: true,
    });
  }
}

