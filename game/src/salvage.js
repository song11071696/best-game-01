// Salvage Drift — salvage shards. They drift after a kill, then the ship's
// tractor beam pulls in every shard inside the magnet radius. Collecting
// one pays credits and pops a little sparkle.
import { rand, TAU, dist2 } from './util.js';
import { PALETTE, SALVAGE_VALUE } from './config.js';

export class Salvage {
  constructor() {
    this.list = [];
  }

  reset() {
    this.list.length = 0;
  }

  spawn(x, y, n = 1, valueMul = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      this.list.push({
        x: x + Math.cos(a) * rand(4, 18),
        y: y + Math.sin(a) * rand(4, 18),
        vx: Math.cos(a) * rand(20, 70),
        vy: Math.sin(a) * rand(20, 70),
        value: SALVAGE_VALUE * valueMul,
        spin: rand(TAU),
        spinSpeed: rand(-3, 3),
        bob: rand(TAU),
      });
    }
  }

  /** Pull shards toward the ship and collect the ones that arrive. Returns credits earned. */
  update(dt, ship, world) {
    let earned = 0;
    const magnetR2 = ship.magnetRadius * ship.magnetRadius;
    const collectR2 = (ship.radius + 12) * (ship.radius + 12);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      s.bob += dt * 4;
      s.spin += s.spinSpeed * dt;
      const d2 = dist2(s.x, s.y, ship.x, ship.y);
      if (d2 < magnetR2) {
        // Tractor beam: accelerate toward the ship, faster the closer it gets.
        const d = Math.sqrt(d2) || 1;
        const pull = 1400 * (1 - d / ship.magnetRadius) + 300;
        s.vx += ((ship.x - s.x) / d) * pull * dt;
        s.vy += ((ship.y - s.y) / d) * pull * dt;
      } else {
        s.vx *= Math.pow(0.985, dt * 60);
        s.vy *= Math.pow(0.985, dt * 60);
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (d2 < collectR2) {
        earned += s.value;
        world.particles.burst(s.x, s.y, PALETTE.salvage, 6, 120);
        world.audio.pickup();
        this.list.splice(i, 1);
      }
    }
    return earned;
  }

  draw(ctx, time) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = PALETTE.salvage;
    for (const s of this.list) {
      const pulse = 1 + 0.15 * Math.sin(s.bob);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.spin);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = PALETTE.salvage;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.salvageCore;
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    void time;
  }
}
