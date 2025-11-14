import { handleButton } from '../interactions/buttons/index.js';
import { handleEditModal } from '../interactions/modals/editEventFieldModal.js';
import { handleLotteryModal } from '../interactions/modals/lotteryModal.js';
import { handleEditSelect } from '../interactions/selects/editEventField.js';

export function registerInteractionHandler(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({ content: 'Commande inconnue.', ephemeral: true });
          return;
        }
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleEditSelect(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('event|lotteryModal')) {
          await handleLotteryModal(interaction);
          return;
        }
        if (interaction.customId.startsWith('event|editModal')) {
          await handleEditModal(interaction);
          return;
        }
      }
    } catch (error) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: `⚠️ ${error.message ?? 'Une erreur est survenue.'}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `⚠️ ${error.message ?? 'Une erreur est survenue.'}`,
          ephemeral: true,
        });
      }
    }
  });
}

