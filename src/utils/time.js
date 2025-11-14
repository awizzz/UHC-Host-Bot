import { DateTime } from 'luxon';
import { config } from '../config.js';

export function ensureDateTime(dateInput, timezone = config.defaultTimezone) {
  if (DateTime.isDateTime(dateInput)) {
    return dateInput.setZone(timezone);
  }
  if (dateInput instanceof Date) {
    return DateTime.fromJSDate(dateInput, { zone: timezone });
  }
  if (typeof dateInput === 'string') {
    return DateTime.fromISO(dateInput, { zone: timezone });
  }
  if (typeof dateInput === 'number') {
    return DateTime.fromMillis(dateInput, { zone: timezone });
  }
  throw new Error('Invalid date input provided.');
}

export function formatAbsolute(dateTime, locale = config.defaultLocale) {
  return ensureDateTime(dateTime).setLocale(locale).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY);
}

export function formatRelative(dateTime, locale = config.defaultLocale) {
  return ensureDateTime(dateTime).setLocale(locale).toRelative({ style: 'short' });
}

export function toUnixSeconds(dateTime) {
  return Math.floor(ensureDateTime(dateTime).toSeconds());
}

export function computeAdmissionTime(startDateTime, admissionOffsetMinutes) {
  const offset = Number.isFinite(admissionOffsetMinutes) ? admissionOffsetMinutes : 0;
  return ensureDateTime(startDateTime).minus({ minutes: Math.max(offset, 0) });
}

export function ensureFuture(dateTime) {
  const dt = ensureDateTime(dateTime);
  if (dt <= DateTime.now().setZone(dt.zone)) {
    throw new Error('Date must be in the future.');
  }
  return dt;
}

export function describeAdmission(admissionOpen, admissionOpensAt, locale = config.defaultLocale) {
  const dt = ensureDateTime(admissionOpensAt);
  if (admissionOpen) {
    return locale.startsWith('fr')
      ? `Admissions ouvertes depuis <t:${toUnixSeconds(dt)}:R>`
      : `Admissions open since <t:${toUnixSeconds(dt)}:R>`;
  }
  return locale.startsWith('fr')
    ? `Admissions à <t:${toUnixSeconds(dt)}:F> (soit <t:${toUnixSeconds(dt)}:R>)`
    : `Admissions on <t:${toUnixSeconds(dt)}:F> (<t:${toUnixSeconds(dt)}:R>)`;
}

export function formatParticipantList(participants, locale = config.defaultLocale) {
  if (!participants.length) {
    return locale.startsWith('fr') ? 'Aucun participant pour le moment.' : 'No participants yet.';
  }
  return participants
    .map(
      (participant, index) => {
        const minecraftPseudo = participant.minecraft_pseudo
          ? ` [${participant.minecraft_pseudo}]`
          : '';
        return `\`${String(index + 1).padStart(2, '0')}\` <@${participant.user_id}>${minecraftPseudo} ${
          participant.admitted ? '✅' : ''
        }`;
      },
    )
    .join('\n');
}

