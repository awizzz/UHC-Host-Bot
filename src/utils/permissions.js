import { PermissionFlagsBits } from 'discord.js';

export function canManageEvent(interaction, event) {
  if (!interaction || !event) return false;
  if (event.guild_id && interaction.guildId && interaction.guildId !== event.guild_id) {
    return false;
  }
  if (interaction.user.id === event.creator_id) {
    return true;
  }
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

export function canUseAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

export function canMentionEveryone(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.MentionEveryone) ?? false;
}

