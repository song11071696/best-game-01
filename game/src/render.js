// Salvage Drift — shared drawing helpers: rounded panels, bars and buttons.
// The HUD, the menus and the upgrade cards all draw through these.
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function panel(ctx, x, y, w, h, fill = 'rgba(4, 8, 22, 0.78)', edge = 'rgba(90, 140, 200, 0.5)') {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = edge;
  ctx.stroke();
}

export function bar(ctx, x, y, w, h, frac, fill, bg = 'rgba(255,255,255,0.14)') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

export function text(ctx, str, x, y, { font = '400 15px "Segoe UI", system-ui, sans-serif', color = '#d8f6ff', align = 'left', alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
  ctx.restore();
}
