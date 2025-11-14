import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const FIELD_CONFIG = {
  title: {
    label: 'Nouveau titre',
    style: TextInputStyle.Short,
    placeholder: 'UHC Week-end',
    required: true,
  },
  description: {
    label: 'Nouvelle description',
    style: TextInputStyle.Paragraph,
    placeholder: 'Résumé de votre événement…',
    required: true,
  },
  slots: {
    label: 'Nombre de places',
    style: TextInputStyle.Short,
    placeholder: '16',
    required: true,
  },
  starts_at: {
    label: 'Nouvelle date (ISO 8601)',
    style: TextInputStyle.Short,
    placeholder: '2025-01-30T20:00',
    required: true,
  },
  link: {
    label: 'Nouveau lien',
    style: TextInputStyle.Short,
    placeholder: 'https://…',
    required: true,
  },
  admission_offset: {
    label: 'Offset admission (minutes)',
    style: TextInputStyle.Short,
    placeholder: '30',
    required: false,
  },
  reminder_minutes: {
    label: 'Rappel (minutes avant)',
    style: TextInputStyle.Short,
    placeholder: '60',
    required: false,
  },
};

export async function handleEditSelect(interaction) {
  const [scope, action, eventId] = interaction.customId.split('|');
  if (scope !== 'event' || action !== 'edit-select' || !eventId) {
    return;
  }

  const value = interaction.values?.[0];
  const config = FIELD_CONFIG[value];
  if (!config) {
    await interaction.reply({ content: 'Champ non reconnu.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`event|editModal|${value}|${eventId}`)
    .setTitle('Modifier un champ');

  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(config.label)
    .setStyle(config.style)
    .setPlaceholder(config.placeholder)
    .setRequired(config.required ?? false);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);
  await interaction.showModal(modal);
}

