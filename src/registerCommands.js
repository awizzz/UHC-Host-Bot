import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';
import { config, validateConfig } from './config.js';

validateConfig();

const rest = new REST({ version: '10' }).setToken(config.token);
const body = commands.map((command) => command.data.toJSON());

async function register() {
  try {
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body,
      });
      console.log(`✅ Commandes enregistrées (guild: ${config.guildId}).`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log(`✅ Commandes enregistrées globalement.`);
    }
  } catch (error) {
    console.error('❌ Impossible de push les commandes:', error);
  }
}

register();

