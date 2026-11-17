// Salvage Drift — the player's salvage skiff. WASD/arrows fly it with a
// little drift, the mouse aims the nose, the guns fire on their own, and
// Space dashes through danger. Hull, shields and upgrades live here.
import { clamp, TAU, angleTo } from './util.js';
import { PLAYER, PALETTE, VIEW_W, VIEW_H } from './config.js';

export class Ship {
  constructor(x, y) {
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = PLAYER.radius;
    this.maxHull = PLAYER.hull;
    this.hull = PLAYER.hull;
    this.shields = 0;
    this.maxShields = 0;
    this.fireInterval = PLAYER.fireInterval;
    this.fireTimer = 0;
    this.shots = 1;
    this.bulletSpeed = PLAYER.bulletSpeed;
    this.bulletDamage = PLAYER.bulletDamage;
    this.pierce = 0;
    this.magnetRadius = PLAYER.magnetRadius;
    this.salvageMul = 1;
    this.dashCooldown = PLAYER.dashCooldown;
    this.dashTimer = 0;
    this.dashTimeLeft = 0;
    this.invuln = 0;
    this.alive = true;
    this.trailTimer = 0;
  }

  /** Returns true when a hit actually hurt the ship. */
  takeHit(damage, world) {
    if (!this.alive || this.invuln > 0 || this.dashTimeLeft > 0) return false;
    if (this.shields > 0) {
      this.shields -= 1;
      this.invuln = 0.6;
      world.particles.ring(this.x, this.y, PALETTE.ship, 50);
      world.audio.hit();
      return true;
    }
    this.hull -= damage;
    this.invuln = PLAYER.invulnTime;
    world.particles.burst(this.x, this.y, '#ff8a7a', 14, 220);
    world.audio.hit();
    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
      world.particles.burst(this.x, this.y, PALETTE.ship, 40, 380);
      world.particles.burst(this.x, this.y, '#ffffff', 20, 260);
      world.particles.ring(this.x, this.y, PALETTE.ship, 90);
    }
    return true;
  }

  update(dt, world) {
    if (!this.alive) return;
    const input = world.input;
    const mv = input.moveVector();
    this.vx += mv.x * PLAYER.accel * dt;
    this.vy += mv.y * PLAYER.accel * dt;
    // Drag keeps the drift feeling without letting speed run away.
    const drag = Math.pow(PLAYER.drag, dt * 60);
    this.vx *= drag;
    this.vy *= drag;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > PLAYER.maxSpeed) {
      this.vx = (this.vx / speed) * PLAYER.maxSpeed;
      this.vy = (this.vy / speed) * PLAYER.maxSpeed;
    }

    // Dash: a short burst in the current move direction (or facing), briefly untouchable.
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    if (input.down('Space') && this.dashTimer <= 0 && (mv.x !== 0 || mv.y !== 0)) {
      const d = Math.hypot(mv.x, mv.y) || 1;
      this.vx = (mv.x / d) * PLAYER.dashSpeed;
      this.vy = (mv.y / d) * PLAYER.dashSpeed;
      this.dashTimeLeft = PLAYER.dashTime;
      this.dashTimer = this.dashCooldown;
      world.audio.dash();
      world.particles.burst(this.x, this.y, PALETTE.ship, 10, 160);
    }
    if (this.dashTimeLeft > 0) this.dashTimeLeft -= dt;

    this.x = clamp(this.x + this.vx * dt, 20, VIEW_W - 20);
    this.y = clamp(this.y + this.vy * dt, 20, VIEW_H - 20);
    if (this.x <= 20 || this.x >= VIEW_W - 20) this.vx = 0;
    if (this.y <= 20 || this.y >= VIEW_H - 20) this.vy = 0;

    this.angle = angleTo(this.x, this.y, input.mouse.x, input.mouse.y);
    this.invuln = Math.max(0, this.invuln - dt);

    // Engine trail.
    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && speed > 40) {
      this.trailTimer = 0.03;
      const bx = this.x - Math.cos(this.angle) * 14;
      const by = this.y - Math.sin(this.angle) * 14;
      world.particles.add(bx, by, { vx: -this.vx * 0.2 + (Math.random() - 0.5) * 30, vy: -this.vy * 0.2 + (Math.random() - 0.5) * 30, life: 0.3, size: 2.5, color: '#2fb9d8' });
    }

    // Auto-fire at the mouse.
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval;
      const spread = 0.09;
      for (let i = 0; i < this.shots; i++) {
        const off = (i - (this.shots - 1) / 2) * spread;
        const a = this.angle + off;
        const nx = this.x + Math.cos(a) * 18;
        const ny = this.y + Math.sin(a) * 18;
        world.bullets.firePlayer(nx, ny, a, this.bulletSpeed, this.bulletDamage, this.pierce);
      }
      world.audio.shoot();
    }
  }

  draw(ctx, time) {
    if (!this.alive) return;
    const blink = this.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (blink) ctx.globalAlpha = 0.35;
    ctx.shadowBlur = 14;
    ctx.shadowColor = PALETTE.ship;
    // Hull: a swept dart.
    ctx.fillStyle = PALETTE.ship;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    // Cockpit.
    ctx.fillStyle = '#06283a';
    ctx.beginPath();
    ctx.arc(5, 0, 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Shield ring.
    if (this.shields > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 5);
      ctx.strokeStyle = PALETTE.ship;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}
