import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { database } from '../database.js';
import { formatRelative } from '../utils/time.js';

export const data = new SlashCommandBuilder()
  .setName('listevents')
  .setDescription('Lister les prochains événements actifs.');

export async function execute(interaction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée sur un serveur.',
      ephemeral: true,
    });
    return;
  }

  const events = database.listUpcomingEvents({ guildId: interaction.guildId, limit: 15 });

  if (!events.length) {
    await interaction.reply({
      content: 'Aucun événement à venir.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📅 Prochains événements')
    .setDescription(
      events
        .map((event) => {
          const hasLink = typeof event.link === 'string' && event.link.trim().length > 0;
          const linkLine = hasLink ? `<${event.link}>` : 'Aucun document';
          return `• \`${event.id}\` — **${event.title}**\n${linkLine}\n<t:${Math.floor(
            new Date(event.starts_at).getTime() / 1000,
          )}:F> (${formatRelative(event.starts_at)})`;
        })
        .join('\n\n'),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

