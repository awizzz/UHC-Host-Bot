import Database from 'better-sqlite3';
import { config } from './config.js';

let dbInstance;

function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(config.databasePath);
    dbInstance.pragma('foreign_keys = ON');
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      slots INTEGER NOT NULL,
      starts_at TEXT NOT NULL,
      admission_offset INTEGER NOT NULL DEFAULT 0,
      admission_opens_at TEXT NOT NULL,
      admission_open INTEGER NOT NULL DEFAULT 0,
      reminder_minutes INTEGER NOT NULL DEFAULT 60,
      link TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      creator_tag TEXT NOT NULL,
      channel_id TEXT,
      message_id TEXT,
      guild_id TEXT,
      locale TEXT NOT NULL,
      timezone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      position INTEGER NOT NULL,
      admitted INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS moderation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      timezone TEXT,
      locale TEXT,
      reminder_minutes INTEGER,
      admission_offset INTEGER,
      log_channel_id TEXT,
      mention_everyone_default INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_minecraft_pseudos (
      user_id TEXT PRIMARY KEY,
      minecraft_pseudo TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export const database = {
  createEvent(payload) {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
      INSERT INTO events (
        id, title, description, slots, starts_at, admission_offset, admission_opens_at,
        admission_open, reminder_minutes, link, creator_id, creator_tag,
        channel_id, guild_id, locale, timezone, status, created_at, updated_at
      ) VALUES (
        @id, @title, @description, @slots, @starts_at, @admission_offset, @admission_opens_at,
        @admission_open, @reminder_minutes, @link, @creator_id, @creator_tag,
        @channel_id, @guild_id, @locale, @timezone, 'ACTIVE', @created_at, @updated_at
      );
    `);

    const event = {
      ...payload,
      admission_open: payload.admission_open ? 1 : 0,
      created_at: now,
      updated_at: now,
    };

    stmt.run(event);
    return this.getEventById(event.id);
  },

  getGuildSettings(guildId) {
    const stmt = getDb().prepare(`
      SELECT *
      FROM guild_settings
      WHERE guild_id = ?
    `);
    const record = stmt.get(guildId);
    if (!record) {
      return null;
    }
    return {
      ...record,
      mention_everyone_default:
        record.mention_everyone_default === null
          ? null
          : record.mention_everyone_default === 1,
    };
  },

  setGuildSettings(guildId, settings) {
    const existing = this.getGuildSettings(guildId) ?? {};
    const merged = {
      timezone: Object.prototype.hasOwnProperty.call(settings, 'timezone')
        ? settings.timezone
        : existing.timezone ?? null,
      locale: Object.prototype.hasOwnProperty.call(settings, 'locale')
        ? settings.locale
        : existing.locale ?? null,
      reminder_minutes: Object.prototype.hasOwnProperty.call(settings, 'reminder_minutes')
        ? settings.reminder_minutes
        : existing.reminder_minutes ?? null,
      admission_offset: Object.prototype.hasOwnProperty.call(settings, 'admission_offset')
        ? settings.admission_offset
        : existing.admission_offset ?? null,
      log_channel_id: Object.prototype.hasOwnProperty.call(settings, 'log_channel_id')
        ? settings.log_channel_id
        : existing.log_channel_id ?? null,
      mention_everyone_default: Object.prototype.hasOwnProperty.call(
        settings,
        'mention_everyone_default',
      )
        ? settings.mention_everyone_default
        : existing.mention_everyone_default ?? null,
    };

    const stmt = getDb().prepare(`
      INSERT INTO guild_settings (
        guild_id, timezone, locale, reminder_minutes, admission_offset, log_channel_id, mention_everyone_default
      ) VALUES (
        @guild_id, @timezone, @locale, @reminder_minutes, @admission_offset, @log_channel_id, @mention_everyone_default
      )
      ON CONFLICT(guild_id) DO UPDATE SET
        timezone = excluded.timezone,
        locale = excluded.locale,
        reminder_minutes = excluded.reminder_minutes,
        admission_offset = excluded.admission_offset,
        log_channel_id = excluded.log_channel_id,
        mention_everyone_default = excluded.mention_everyone_default;
    `);

    stmt.run({
      guild_id: guildId,
      timezone: merged.timezone,
      locale: merged.locale,
      reminder_minutes: merged.reminder_minutes,
      admission_offset: merged.admission_offset,
      log_channel_id: merged.log_channel_id,
      mention_everyone_default:
        typeof merged.mention_everyone_default === 'boolean'
          ? merged.mention_everyone_default
            ? 1
            : 0
          : merged.mention_everyone_default === null
            ? null
            : merged.mention_everyone_default,
    });

    return this.getGuildSettings(guildId);
  },

  updateEvent(id, changes) {
    const validKeys = Object.keys(changes).filter((key) => typeof changes[key] !== 'undefined');
    if (!validKeys.length) {
      return this.getEventById(id);
    }
    const setters = validKeys.map((key) => `${key} = @${key}`);
    const stmt = getDb().prepare(`
      UPDATE events
      SET ${setters.join(', ')}, updated_at = @updated_at
      WHERE id = @id;
    `);
    stmt.run({ ...changes, updated_at: new Date().toISOString(), id });
    return this.getEventById(id);
  },

  updateEventStatus(id, status) {
    return this.updateEvent(id, { status });
  },

  setEventMessageReference(id, guildId, channelId, messageId) {
    return this.updateEvent(id, {
      guild_id: guildId,
      channel_id: channelId,
      message_id: messageId,
    });
  },

  getEventById(id) {
    const stmt = getDb().prepare(`SELECT * FROM events WHERE id = ?`);
    return stmt.get(id);
  },

  listActiveEvents({ guildId = null } = {}) {
    if (guildId) {
      const stmt = getDb().prepare(`
        SELECT *
        FROM events
        WHERE status = 'ACTIVE' AND guild_id = ?
        ORDER BY datetime(starts_at) ASC;
      `);
      return stmt.all(guildId);
    }
    const stmt = getDb().prepare(`
      SELECT *
      FROM events
      WHERE status = 'ACTIVE'
      ORDER BY datetime(starts_at) ASC;
    `);
    return stmt.all();
  },

  listUpcomingEvents({ guildId = null, limit = 10 } = {}) {
    if (guildId) {
      const stmt = getDb().prepare(`
        SELECT *
        FROM events
        WHERE status = 'ACTIVE'
          AND guild_id = ?
          AND datetime(starts_at) >= datetime('now')
        ORDER BY datetime(starts_at) ASC
        LIMIT ?;
      `);
      return stmt.all(guildId, limit);
    }
    const stmt = getDb().prepare(`
      SELECT *
      FROM events
      WHERE status = 'ACTIVE' AND datetime(starts_at) >= datetime('now')
      ORDER BY datetime(starts_at) ASC
      LIMIT ?;
    `);
    return stmt.all(limit);
  },

  insertParticipant(eventId, userId, userTag) {
    const now = new Date().toISOString();
    const db = getDb();
    const existingCount = db
      .prepare(`SELECT COUNT(*) AS total FROM participants WHERE event_id = ?`)
      .get(eventId);

    const stmt = db.prepare(`
      INSERT INTO participants (event_id, user_id, user_tag, joined_at, position, admitted)
      VALUES (?, ?, ?, ?, ?, 0);
    `);
    stmt.run(eventId, userId, userTag, now, existingCount.total + 1);
    return this.getParticipants(eventId);
  },

  setParticipantAdmission(eventId, userId, admitted) {
    const stmt = getDb().prepare(`
      UPDATE participants
      SET admitted = ?
      WHERE event_id = ? AND user_id = ?;
    `);
    stmt.run(admitted ? 1 : 0, eventId, userId);
  },

  removeParticipant(eventId, userId) {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM participants WHERE event_id = ? AND user_id = ?;
    `);
    stmt.run(eventId, userId);
    // Re-number positions to keep order contiguous
    const participants = db
      .prepare(
        `SELECT user_id, row_number() OVER (ORDER BY joined_at ASC) AS new_pos
         FROM participants
         WHERE event_id = ?
         ORDER BY joined_at ASC;`,
      )
      .all(eventId);

    const updateStmt = db.prepare(`
      UPDATE participants
      SET position = ?
      WHERE event_id = ? AND user_id = ?;
    `);
    const transaction = db.transaction(() => {
      for (const participant of participants) {
        updateStmt.run(participant.new_pos, eventId, participant.user_id);
      }
    });
    transaction();
    return this.getParticipants(eventId);
  },

  getParticipant(eventId, userId) {
    const stmt = getDb().prepare(`
      SELECT *
      FROM participants
      WHERE event_id = ? AND user_id = ?;
    `);
    return stmt.get(eventId, userId);
  },

  getParticipants(eventId) {
    const stmt = getDb().prepare(`
      SELECT 
        p.*,
        mp.minecraft_pseudo
      FROM participants p
      LEFT JOIN user_minecraft_pseudos mp ON p.user_id = mp.user_id
      WHERE p.event_id = ?
      ORDER BY p.position ASC;
    `);
    return stmt.all(eventId);
  },

  clearParticipants(eventId) {
    const stmt = getDb().prepare(`DELETE FROM participants WHERE event_id = ?;`);
    stmt.run(eventId);
  },

  logModerationEntry(entry) {
    const stmt = getDb().prepare(`
      INSERT INTO moderation_logs (event_id, user_id, action, message, metadata, created_at)
      VALUES (@event_id, @user_id, @action, @message, @metadata, @created_at);
    `);
    stmt.run({
      ...entry,
      created_at: new Date().toISOString(),
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  },

  setMinecraftPseudo(userId, minecraftPseudo) {
    const now = new Date().toISOString();
    const stmt = getDb().prepare(`
      INSERT INTO user_minecraft_pseudos (user_id, minecraft_pseudo, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        minecraft_pseudo = excluded.minecraft_pseudo,
        updated_at = excluded.updated_at;
    `);
    stmt.run(userId, minecraftPseudo, now);
    return this.getMinecraftPseudo(userId);
  },

  getMinecraftPseudo(userId) {
    const stmt = getDb().prepare(`
      SELECT minecraft_pseudo, updated_at
      FROM user_minecraft_pseudos
      WHERE user_id = ?;
    `);
    return stmt.get(userId);
  },
};

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

