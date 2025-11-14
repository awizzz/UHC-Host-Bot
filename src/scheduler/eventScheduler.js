import schedule from 'node-schedule';
import { ensureDateTime } from '../utils/time.js';

export class EventScheduler {
  constructor() {
    this.jobs = new Map();
    this.handlers = {
      onAdmissionOpen: async () => {},
      onReminder: async () => {},
      onAutoDraw: async () => {},
    };
  }

  bindHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  scheduleEvent(event) {
    this.cancelEvent(event.id);

    if (event.status !== 'ACTIVE') {
      return;
    }

    const admissionDate = ensureDateTime(event.admission_opens_at).toJSDate();
    const reminderDate = ensureDateTime(event.starts_at)
      .minus({ minutes: event.reminder_minutes ?? 60 })
      .toJSDate();
    const startDate = ensureDateTime(event.starts_at).toJSDate();

    if (!event.admission_open) {
      this.registerJob(`admission:${event.id}`, admissionDate, () =>
        this.handlers.onAdmissionOpen(event.id).catch(console.error),
      );
    }

    this.registerJob(`reminder:${event.id}`, reminderDate, () =>
      this.handlers.onReminder(event.id).catch(console.error),
    );

    this.registerJob(`autoDraw:${event.id}`, startDate, () =>
      this.handlers.onAutoDraw(event.id).catch(console.error),
    );
  }

  cancelEvent(eventId) {
    for (const key of ['admission', 'reminder', 'autoDraw']) {
      this.cancelJob(`${key}:${eventId}`);
    }
  }

  cancelJob(jobKey) {
    const job = this.jobs.get(jobKey);
    if (job) {
      job.cancel();
      this.jobs.delete(jobKey);
    }
  }

  registerJob(key, date, callback) {
    if (Number.isNaN(date?.getTime())) {
      return;
    }

    if (date.getTime() <= Date.now()) {
      // Execute immediately when the scheduled date is in the past.
      callback();
      return;
    }

    const job = schedule.scheduleJob(date, callback);
    if (job) {
      this.jobs.set(key, job);
    }
  }
}

