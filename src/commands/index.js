import * as createEvent from './createEvent.js';
import * as editEvent from './editEvent.js';
import * as cancelEvent from './cancelEvent.js';
import * as listEvents from './listEvents.js';
import * as drawEvent from './drawEvent.js';
import * as forceAdmit from './forceAdmit.js';
import * as configCommand from './config.js';
import * as pseudo from './pseudo.js';

export const commands = [
  createEvent,
  editEvent,
  cancelEvent,
  listEvents,
  drawEvent,
  forceAdmit,
  configCommand,
  pseudo,
];

