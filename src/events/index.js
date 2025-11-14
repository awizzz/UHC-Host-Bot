import { registerInteractionHandler } from './interactionCreate.js';
import { registerReadyHandler } from './ready.js';

export function registerEvents(client) {
  registerInteractionHandler(client);
  registerReadyHandler(client);
}

