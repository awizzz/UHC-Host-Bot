const CANVAS_WIDTH = 800;
const ROW_HEIGHT = 40;
const AVATAR_SIZE = 32;
const PADDING_X = 16;
const PADDING_Y = 16;
const TEXT_MARGIN_X = 12;
const MAX_ROWS = 25;

let canvasModulePromise = null;

async function loadCanvasModule() {
  if (!canvasModulePromise) {
    canvasModulePromise = import('canvas').catch(() => null);
  }
  return canvasModulePromise;
}

function getMinecraftHeadUrl(minecraftPseudo, size = AVATAR_SIZE) {
  if (!minecraftPseudo) {
    return null;
  }
  const safePseudo = encodeURIComponent(minecraftPseudo);
  return `https://minotar.net/helm/${safePseudo}/${size}.png`;
}

async function drawListImage(rows) {
  const rowCount = Math.min(rows.length, MAX_ROWS);
  if (rowCount === 0) {
    return null;
  }

  const height = PADDING_Y * 2 + rowCount * ROW_HEIGHT;

  const canvasModule = await loadCanvasModule();
  if (!canvasModule) {
    return null;
  }
  const { createCanvas, loadImage } = canvasModule;
  const canvas = createCanvas(CANVAS_WIDTH, height);
  const ctx = canvas.getContext('2d');

  // Fond sombre proche du thème Discord
  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(0, 0, CANVAS_WIDTH, height);

  ctx.font = '20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < rowCount; i += 1) {
    const row = rows[i];
    const yCenter = PADDING_Y + i * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Bande alternée pour la lisibilité
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(
        PADDING_X / 2,
        yCenter - ROW_HEIGHT / 2,
        CANVAS_WIDTH - PADDING_X,
        ROW_HEIGHT,
      );
    }

    // Tête Minecraft
    if (row.minecraftPseudo) {
      const url = getMinecraftHeadUrl(row.minecraftPseudo, AVATAR_SIZE);
      if (url) {
        try {
          const img = await loadImage(url);
          ctx.drawImage(
            img,
            PADDING_X,
            yCenter - AVATAR_SIZE / 2,
            AVATAR_SIZE,
            AVATAR_SIZE,
          );
        } catch {
          // Ignore les erreurs de chargement d'image
        }
      }
    }

    // Texte
    const textX = PADDING_X + AVATAR_SIZE + TEXT_MARGIN_X;
    const label = row.label;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, textX, yCenter);
  }

  return canvas.toBuffer('image/png');
}

export async function createParticipantsImageAttachment(event, participants) {
  const rows = participants.map((participant, index) => {
    const rank = String(index + 1).padStart(2, '0');
    const baseName = participant.user_tag ?? participant.user_id;
    const mc = participant.minecraft_pseudo ? ` [${participant.minecraft_pseudo}]` : '';
    const admitted = participant.admitted ? ' (✅ admis)' : '';
    return {
      minecraftPseudo: participant.minecraft_pseudo,
      label: `#${rank} ${baseName}${mc}${admitted}`,
    };
  });

  const buffer = await drawListImage(rows);
  if (!buffer) {
    return null;
  }

  const safeId = event.id?.replace(/[^a-zA-Z0-9_-]/g, '') || 'event';
  const name = `participants-${safeId}.png`;

  return { attachment: buffer, name };
}

export async function createWinnersImageAttachment(event, winners) {
  const rows = winners.map((winner, index) => {
    const rank = String(index + 1).padStart(2, '0');
    const baseName = winner.user_tag ?? winner.user_id;
    const mc = winner.minecraft_pseudo ? ` [${winner.minecraft_pseudo}]` : '';
    return {
      minecraftPseudo: winner.minecraft_pseudo,
      label: `#${rank} ${baseName}${mc}`,
    };
  });

  const buffer = await drawListImage(rows);
  if (!buffer) {
    return null;
  }

  const safeId = event.id?.replace(/[^a-zA-Z0-9_-]/g, '') || 'event';
  const name = `winners-${safeId}.png`;

  return { attachment: buffer, name };
}


