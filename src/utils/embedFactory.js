import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { formatAbsolute, formatRelative, toUnixSeconds, describeAdmission } from './time.js';

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
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(locale.startsWith('fr') ? `Participants • ${event.title}` : `Participants • ${event.title}`)
    .setDescription(
      participants.length
        ? participants
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
            .join('\n')
        : locale.startsWith('fr')
          ? 'Aucun participant pour le moment.'
          : 'No participants yet.',
    )
    .setFooter({ text: `ID: ${event.id}` });
}

export function buildDrawEmbed({ event, winners, authorTag }) {
  const locale = (event.locale || config.defaultLocale).toLowerCase();

  const title = locale.startsWith('fr')
    ? `🎲 Résultats du tirage • ${event.title}`
    : `🎲 Draw Results • ${event.title}`;

  const description = winners.length
    ? winners
        .map((winner, index) => {
          const minecraftPseudo = winner.minecraft_pseudo
            ? ` [${winner.minecraft_pseudo}]`
            : '';
          return `**${index + 1}.** <@${winner.user_id}>${minecraftPseudo}`;
        })
        .join('\n')
    : locale.startsWith('fr')
      ? 'Personne ne remporte ce tirage.'
      : 'No winners for this draw.';

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: locale.startsWith('fr')
        ? `Tirage effectué par ${authorTag}`
        : `Draw executed by ${authorTag}`,
    })
    .setTimestamp(new Date());
}

