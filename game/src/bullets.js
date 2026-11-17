// Salvage Drift — projectiles. Two pools: the player's shots (cyan, fast)
// and enemy orbs (magenta, slow). Movement only; collisions live in main.js.
import { TAU } from './util.js';
import { PALETTE } from './config.js';

export class Bullets {
  constructor() {
    this.player = [];
    this.enemy = [];
  }

  reset() {
    this.player.length = 0;
    this.enemy.length = 0;
  }

  firePlayer(x, y, angle, speed, damage, pierce = 0) {
    this.player.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 4, damage, pierce, hit: new Set() });
  }

  fireEnemy(x, y, angle, speed, damage) {
    this.enemy.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 6, damage });
  }

  update(dt, w, h) {
    for (let i = this.player.length - 1; i >= 0; i--) {
      const b = this.player[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) this.player.splice(i, 1);
    }
    for (let i = this.enemy.length - 1; i >= 0; i--) {
      const b = this.enemy[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) this.enemy.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 8;
    for (const b of this.player) {
      ctx.shadowColor = PALETTE.bullet;
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU);
      ctx.fill();
    }
    for (const b of this.enemy) {
      ctx.shadowColor = PALETTE.enemyOrb;
      ctx.fillStyle = PALETTE.enemyOrb;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd7f2';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
