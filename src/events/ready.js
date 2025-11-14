import { logConsole } from '../logger.js';

export function registerReadyHandler(client) {
  client.once('ready', async () => {
    logConsole('UHC HOSTS connecté.', { tag: client.user.tag });
    await client.user.setActivity('made by Awizz', { type: 3 });
    client.eventManager.rescheduleAll();
    logConsole('Reprogrammation des événements terminée.');
  });
}

