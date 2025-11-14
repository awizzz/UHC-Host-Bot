export async function handleLotteryModal(interaction) {
  const [, , eventId] = interaction.customId.split('|');
  const manager = interaction.client.eventManager;

  if (!eventId || !manager) {
    await interaction.reply({ content: 'Tirage indisponible.', ephemeral: true });
    return;
  }

  const winnersInput = interaction.fields.getTextInputValue('winners');
  const winnersCount = winnersInput ? Number.parseInt(winnersInput, 10) : undefined;

  try {
    const winners = await manager.runDraw(interaction, eventId, winnersCount);
    await interaction.reply({
      content: `🎲 Tirage effectué. ${winners.length} gagnant(s) annoncés.`,
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: `⚠️ ${error.message ?? 'Erreur lors du tirage.'}`,
      ephemeral: true,
    });
  }
}

