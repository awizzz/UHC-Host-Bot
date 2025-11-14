import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { closeDatabase } from './database.js';
import { config, validateConfig } from './config.js';
import { commands } from './commands/index.js';
import { registerEvents } from './events/index.js';
import { initializeLogger, logConsole } from './logger.js';
import { createEventManager } from './services/eventManager.js';

validateConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.eventManager = createEventManager({ client });
initializeLogger(client);

registerEvents(client);

client
  .login(config.token)
  .then(() => logConsole('Connexion Discord initiée.'))
  .catch((error) => {
    console.error('Impossible de se connecter:', error);
    process.exit(1);
  });

const shutdown = async () => {
  logConsole('Arrêt du bot...');
  try {
    await client.destroy();
  } catch (error) {
    console.error('Erreur lors de la fermeture du client:', error);
  }
  closeDatabase();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

