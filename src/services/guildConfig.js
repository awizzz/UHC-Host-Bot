import { config } from '../config.js';
import { database } from '../database.js';

export function getGuildConfig(guildId) {
  const record = guildId ? database.getGuildSettings(guildId) : null;
  return {
    guildId: guildId ?? null,
    timezone: record?.timezone || config.defaultTimezone,
    locale: (record?.locale || config.defaultLocale).toLowerCase(),
    reminderMinutes:
      typeof record?.reminder_minutes === 'number'
        ? record.reminder_minutes
        : config.defaultReminderMinutes,
    admissionOffset:
      typeof record?.admission_offset === 'number' ? record.admission_offset : 0,
    logChannelId: record?.log_channel_id || config.logChannelId || null,
    mentionEveryoneDefault:
      typeof record?.mention_everyone_default === 'boolean'
        ? record.mention_everyone_default
        : null,
  };
}

export function updateGuildConfig(guildId, updates) {
  if (!guildId) {
    throw new Error('Guild ID is required to update configuration.');
  }

  const payload = {
    timezone: Object.prototype.hasOwnProperty.call(updates, 'timezone')
      ? updates.timezone ?? null
      : undefined,
    locale: Object.prototype.hasOwnProperty.call(updates, 'locale')
      ? updates.locale ?? null
      : undefined,
    reminder_minutes: Object.prototype.hasOwnProperty.call(updates, 'reminderMinutes')
      ? updates.reminderMinutes ?? null
      : undefined,
    admission_offset: Object.prototype.hasOwnProperty.call(updates, 'admissionOffset')
      ? updates.admissionOffset ?? null
      : undefined,
    log_channel_id: Object.prototype.hasOwnProperty.call(updates, 'logChannelId')
      ? updates.logChannelId ?? null
      : undefined,
    mention_everyone_default: Object.prototype.hasOwnProperty.call(
      updates,
      'mentionEveryoneDefault',
    )
      ? updates.mentionEveryoneDefault === null
        ? null
        : updates.mentionEveryoneDefault
          ? 1
          : 0
      : undefined,
  };

  const filteredPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

  database.setGuildSettings(guildId, filteredPayload);
  return getGuildConfig(guildId);
}

