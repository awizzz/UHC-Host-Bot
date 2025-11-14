import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  computeAdmissionTime,
  formatRelative,
  formatAbsolute,
} from '../src/utils/time.js';

function testComputeAdmissionTime() {
  const start = DateTime.fromISO('2030-01-01T20:00:00', { zone: 'UTC' });
  const admission = computeAdmissionTime(start, 90);
  assert.equal(admission.toISO(), start.minus({ minutes: 90 }).toISO());
}

function testFormatters() {
  const now = DateTime.now().plus({ hours: 2 });
  const relative = formatRelative(now);
  assert.ok(typeof relative === 'string');
  const absolute = formatAbsolute(now);
  assert.ok(typeof absolute === 'string');
}

try {
  testComputeAdmissionTime();
  testFormatters();
  console.log('✅ Tests utilitaires réussis.');
} catch (error) {
  console.error('❌ Tests échoués:', error);
  process.exit(1);
}

