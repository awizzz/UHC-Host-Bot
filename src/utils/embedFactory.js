import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { formatAbsolute, formatRelative, toUnixSeconds, describeAdmission } from './time.js';

function getMinecraftHeadUrl(minecraftPseudo, size = 32) {
  if (!minecraftPseudo) {
    return null;
  }
  const safePseudo = encodeURIComponent(minecraftPseudo);
  // Utilisation de Minotar pour afficher la tête Minecraft du pseudo
  return `https://minotar.net/helm/${safePseudo}/${size}.png`;
}

const BRAND_COLOR = 0xff914d;

export function buildEventEmbed(event, participants = []) {
  const locale = (event.locale || config.defaultLocale).toLowerCase();
  const participantsCount = participants.length;
  const slotsAvailable = Math.max(event.slots - participantsCount, 0);
  const baseDateLabel = locale.startsWith('fr') ? 'Début' : 'Starts';
  const slotsLabel = locale.startsWith('fr') ? 'Places' : 'Slots';
  const participantsLabel = locale.startsWith('fr') ? 'Participants' : 'Participants';
  const instructionsLabel = locale.startsWith('fr') ? 'Comment participer ?' : 'How to participate?';
  const instructions = locale.startsWith('fr')
    ? '✅ Rejoindre | ❌ Se désinscrire | 📋 Liste | 🎲 Tirage'
    : '✅ Join | ❌ Leave | 📋 List | 🎲 Draw';
  const linkLabel = locale.startsWith('fr') ? 'Document' : 'Document';
  const admissionLabel = locale.startsWith('fr') ? 'Admissions' : 'Admissions';

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(event.title)
    .setDescription(event.description)
    .addFields(
      {
        name: `${baseDateLabel}`,
        value: `<t:${toUnixSeconds(event.starts_at)}:F>\n(${formatRelative(event.starts_at, locale)})`,
        inline: true,
      },
      {
        name: slotsLabel,
        value: `${participantsCount}/${event.slots}\n${locale.startsWith('fr') ? 'Restant' : 'Remaining'}: ${slotsAvailable}`,
        inline: true,
      },
      {
        name: participantsLabel,
        value:
          participantsCount > 0
            ? participants
                .slice(0, 12)
                .map((participant, index) => {
                  const baseIndex = `\`${String(index + 1).padStart(2, '0')}\``;
                  const minecraftPseudoLabel = participant.minecraft_pseudo
                    ? ` [${participant.minecraft_pseudo}]`
                    : '';
                  const headUrl = getMinecraftHeadUrl(participant.minecraft_pseudo);
                  const headLink = headUrl ? ` ([tête](${headUrl}))` : '';
                  const admittedIcon = participant.admitted ? '✅' : '';
                  return `${baseIndex} <@${participant.user_id}>${minecraftPseudoLabel}${headLink} ${admittedIcon}`;
                })
                .join('\n')
            : locale.startsWith('fr')
              ? 'Aucun participant pour le moment.'
              : 'No participants yet.',
      },
      {
        name: instructionsLabel,
        value: instructions,
      },
      {
        name: linkLabel,
        value: event.link,
      },
      {
        name: admissionLabel,
        value: describeAdmission(Boolean(event.admission_open), event.admission_opens_at, locale),
      },
    )
    .setFooter({
      text: locale.startsWith('fr')
        ? `ID: ${event.id} • Créé par ${event.creator_tag}`
        : `ID: ${event.id} • Created by ${event.creator_tag}`,
    })
    .setTimestamp(new Date(event.updated_at || event.created_at));
}

export function buildParticipantListEmbed(event, participants) {
  const locale = (event.locale || config.defaultLocale).toLowerCase();
  const description =
    participants.length
      ? participants
          .map((participant, index) => {
            const baseIndex = `\`${String(index + 1).padStart(2, '0')}\``;
            const minecraftPseudoLabel = participant.minecraft_pseudo
              ? ` [${participant.minecraft_pseudo}]`
              : '';
            const headUrl = getMinecraftHeadUrl(participant.minecraft_pseudo);
            const headLink = headUrl ? ` ([tête](${headUrl}))` : '';
            const admittedIcon = participant.admitted ? '✅' : '';
            return `${baseIndex} <@${participant.user_id}>${minecraftPseudoLabel}${headLink} ${admittedIcon}`;
          })
          .join('\n')
      : locale.startsWith('fr')
        ? 'Aucun participant pour le moment.'
        : 'No participants yet.';

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(locale.startsWith('fr') ? `Participants • ${event.title}` : `Participants • ${event.title}`)
    .setDescription(description)
    .setFooter({ text: `ID: ${event.id}` });

  // Afficher visuellement au moins une tête (premier participant avec pseudo)
  const firstWithPseudo = participants.find((p) => p.minecraft_pseudo);
  const thumbUrl = firstWithPseudo ? getMinecraftHeadUrl(firstWithPseudo.minecraft_pseudo, 64) : null;
  if (thumbUrl) {
    embed.setThumbnail(thumbUrl);
  }

  return embed;
}

export function buildDrawEmbed({ event, winners, authorTag }) {
  const locale = (event.locale || config.defaultLocale).toLowerCase();

  const title = locale.startsWith('fr')
    ? `🎲 Résultats du tirage • ${event.title}`
    : `🎲 Draw Results • ${event.title}`;

  const description = winners.length
    ? winners
        .map((winner, index) => {
          const minecraftPseudoLabel = winner.minecraft_pseudo
            ? ` [${winner.minecraft_pseudo}]`
            : '';
          const headUrl = getMinecraftHeadUrl(winner.minecraft_pseudo, 64);
          const headLink = headUrl ? ` ([tête](${headUrl}))` : '';
          return `**${index + 1}.** <@${winner.user_id}>${minecraftPseudoLabel}${headLink}`;
        })
        .join('\n')
    : locale.startsWith('fr')
      ? 'Personne ne remporte ce tirage.'
      : 'No winners for this draw.';

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: locale.startsWith('fr')
        ? `Tirage effectué par ${authorTag}`
        : `Draw executed by ${authorTag}`,
    })
    .setTimestamp(new Date());

  // Afficher la tête du premier gagnant avec pseudo comme image principale
  const firstWinnerWithPseudo = winners.find((w) => w.minecraft_pseudo);
  const winnerThumb = firstWinnerWithPseudo
    ? getMinecraftHeadUrl(firstWinnerWithPseudo.minecraft_pseudo, 128)
    : null;
  if (winnerThumb) {
    embed.setThumbnail(winnerThumb);
  }

  return embed;
}

