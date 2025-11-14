import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const defaultDatabasePath = path.resolve(process.cwd(), 'data', 'uhc-hosts.db');

const dataDir = path.dirname(defaultDatabasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const config = {
  token: process.env.DISCORD_TOKEN ?? '',
  clientId: process.env.CLIENT_ID ?? '',
  guildId: process.env.GUILD_ID || null,
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : defaultDatabasePath,
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Europe/Paris',
  defaultLocale: (process.env.DEFAULT_LOCALE || 'fr').toLowerCase(),
  defaultReminderMinutes: Number.parseInt(process.env.DEFAULT_REMINDER_MINUTES ?? '60', 10),
  defaultAdmissionOffset: Number.parseInt(process.env.DEFAULT_ADMISSION_OFFSET ?? '0', 10),
  defaultMentionEveryone:
    typeof process.env.DEFAULT_MENTION_EVERYONE === 'string'
      ? process.env.DEFAULT_MENTION_EVERYONE.toLowerCase() === 'true'
      : false,
  logChannelId: process.env.LOG_CHANNEL_ID || null,
};

export function validateConfig() {
  if (!config.token) {
    throw new Error('Missing DISCORD_TOKEN in environment configuration.');
  }
  if (!config.clientId) {
    throw new Error('Missing CLIENT_ID in environment configuration.');
  }
}

