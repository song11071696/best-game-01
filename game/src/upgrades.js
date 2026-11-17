// Salvage Drift — the between-wave upgrade draft. Three cards, one choice:
// click a card or press 1, 2 or 3. The card art is drawn, not loaded.
import { VIEW_W, VIEW_H, PALETTE } from './config.js';
import { roundRect } from './render.js';

export const CARD_W = 250;
export const CARD_H = 170;
export const CARD_GAP = 24;

/** Rectangle of card i (0, 1, 2), centered as a row. */
export function cardRect(i, count = 3) {
  const total = count * CARD_W + (count - 1) * CARD_GAP;
  const x0 = (VIEW_W - total) / 2;
  return { x: x0 + i * (CARD_W + CARD_GAP), y: 250, w: CARD_W, h: CARD_H };
}

/** Draw the draft overlay and cards. Returns the index under the mouse, or -1. */
export function drawUpgradeChoices(ctx, choices, mouse, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(3, 6, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WAVE CLEARED', VIEW_W / 2, 150);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '400 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Choose one upgrade — click a card or press 1, 2 or 3', VIEW_W / 2, 186);

  let hovered = -1;
  choices.forEach((u, i) => {
    const r = cardRect(i, choices.length);
    const inside = mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
    if (inside) hovered = i;
    const lift = inside ? -6 : 0;
    const bob = inside ? 0 : Math.sin(time * 2 + i * 1.3) * 2;
    ctx.save();
    ctx.translate(0, lift + bob);
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fillStyle = inside ? '#16224d' : PALETTE.card;
    ctx.fill();
    ctx.lineWidth = inside ? 2.5 : 1.5;
    ctx.strokeStyle = inside ? PALETTE.gold : PALETTE.cardEdge;
    ctx.stroke();
    // Key hint.
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[${i + 1}]`, r.x + 14, r.y + 26);
    // Name.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 21px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(u.name, r.x + r.w / 2, r.y + 62);
    // Description, wrapped to two lines.
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
    wrapText(ctx, u.desc, r.x + r.w / 2, r.y + 92, r.w - 32, 20);
    ctx.restore();
  });
  ctx.restore();
  return hovered;
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
}
