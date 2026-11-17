// Salvage Drift — pure visuals: explosion particles, floating score text
// and the parallax starfield behind everything. No gameplay lives here.
import { rand, TAU } from './util.js';

export class Particles {
  constructor() {
    this.list = [];
  }

  add(x, y, { vx = 0, vy = 0, life = 0.5, size = 3, color = '#ffffff', drag = 0.98, grav = 0 } = {}) {
    this.list.push({ x, y, vx, vy, life, maxLife: life, size, color, drag, grav });
  }

  /** A radial burst of sparks. */
  burst(x, y, color, n = 18, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(speed * 0.25, speed);
      this.add(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.8), size: rand(1.5, 3.5), color });
    }
  }

  /** A soft ring that expands and fades (shockwave). */
  ring(x, y, color, maxR = 60) {
    this.list.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: maxR, color, ring: true, drag: 1, grav: 0 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = p.life / p.maxLife;
      if (p.ring) {
        ctx.globalAlpha = t * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t) + 4, 0, TAU);
        ctx.stroke();
      } else {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t + 0.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

export class FloatTexts {
  constructor() {
    this.list = [];
  }

  add(x, y, text, color = '#ffffff', size = 15) {
    this.list.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.textAlign = 'center';
    for (const t of this.list) {
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.6);
      ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

export class Starfield {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.layers = [];
    for (let l = 0; l < 3; l++) {
      const stars = [];
      const n = [70, 45, 25][l];
      for (let i = 0; i < n; i++) {
        stars.push({ x: rand(w), y: rand(h), r: rand(0.6, 1.4 + l * 0.5), tw: rand(TAU) });
      }
      this.layers.push({ speed: [14, 30, 55][l], stars });
    }
    // A few soft nebula blobs, drawn once to an offscreen canvas.
    this.nebula = document.createElement('canvas');
    this.nebula.width = w;
    this.nebula.height = h;
    const nctx = this.nebula.getContext('2d');
    const blobs = [
      { x: 180, y: 120, r: 260, c: 'rgba(46, 74, 160, 0.20)' },
      { x: 780, y: 420, r: 300, c: 'rgba(120, 40, 140, 0.16)' },
      { x: 520, y: 520, r: 220, c: 'rgba(20, 120, 130, 0.14)' },
    ];
    for (const b of blobs) {
      const g = nctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, b.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      nctx.fillStyle = g;
      nctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
  }

  update(dt, drift = 1) {
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        s.y += layer.speed * drift * dt;
        s.tw += dt * 2;
        if (s.y > this.h + 2) { s.y = -2; s.x = rand(this.w); }
      }
    }
  }

  draw(ctx, time) {
    ctx.drawImage(this.nebula, 0, 0);
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(s.tw + time);
        ctx.fillStyle = '#cfe4ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
