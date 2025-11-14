import { DateTime } from 'luxon';
import { config } from '../../config.js';

export async function handleEditModal(interaction) {
  const [scope, action, field, eventId] = interaction.customId.split('|');
  if (scope !== 'event' || action !== 'editModal' || !eventId) {
    return;
  }

  const value = interaction.fields.getTextInputValue('value');
  const manager = interaction.client.eventManager;
  if (!manager) {
    await interaction.reply({ content: 'Modification indisponible.', ephemeral: true });
    return;
  }

  try {
    const payload = mapFieldValue(field, value);
    await manager.updateEvent(interaction, eventId, payload);
    await interaction.reply({
      content: config.defaultLocale.startsWith('fr')
        ? '✅ Mise à jour effectuée.'
        : '✅ Update applied.',
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: `⚠️ ${error.message ?? 'Erreur lors de la mise à jour.'}`,
      ephemeral: true,
    });
  }
}

function mapFieldValue(field, rawValue) {
  switch (field) {
    case 'title':
      if (!rawValue.trim()) throw new Error('Le titre est requis.');
      return { title: rawValue.trim() };
    case 'description':
      if (!rawValue.trim()) throw new Error('La description est requise.');
      return { description: rawValue.trim() };
    case 'slots': {
      const slots = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(slots) || slots < 1) {
        throw new Error('Le nombre de places doit être supérieur à 0.');
      }
      return { slots };
    }
    case 'starts_at': {
      const date = DateTime.fromISO(rawValue, { zone: config.defaultTimezone });
      if (!date.isValid) {
        throw new Error("Format de date invalide. Utilisez ISO 8601 (ex: 2025-01-30T20:00).");
      }
      return { starts_at: date.toISO() };
    }
    case 'link':
      if (!/^https?:\/\//i.test(rawValue.trim())) {
        throw new Error('Le lien doit commencer par http:// ou https://');
      }
      return { link: rawValue.trim() };
    case 'admission_offset': {
      const offset = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(offset) || offset < 0) {
        throw new Error("L'offset doit être un entier positif.");
      }
      return { admission_offset: offset };
    }
    case 'reminder_minutes': {
      const reminder = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(reminder) || reminder < 5) {
        throw new Error('Le rappel doit être un entier (>=5).');
      }
      return { reminder_minutes: reminder };
    }
    default:
      throw new Error('Champ non pris en charge.');
  }
}

