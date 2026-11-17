// Salvage Drift — the opposition. Drones chase and shoot, Weavers sweep in
// sine waves with a spread shot, Asteroids drift and split into Rocks, and
// every fifth wave brings a Marauder boss. One manager owns the list.
import { rand, randi, clamp, TAU, angleTo } from './util.js';
import { ENEMY, PALETTE, VIEW_W, VIEW_H } from './config.js';

class Base {
  constructor(kind, x, y) {
    const def = ENEMY[kind];
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.radius = def.radius;
    this.score = def.score;
    this.salvage = def.salvage;
    this.fireTimer = rand(0.8, def.fireInterval || 2);
    this.t = rand(100);
    this.rot = rand(TAU);
    this.rotSpeed = rand(-1.2, 1.2);
    this.flash = 0;   // white hit-flash timer
  }

  hurt(dmg) {
    this.hp -= dmg;
    this.flash = 0.08;
  }

  get dead() {
    return this.hp <= 0;
  }
}

export class Drone extends Base {
  constructor(x, y) { super('drone', x, y); }

  update(dt, world) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    const ship = world.ship;
    const a = angleTo(this.x, this.y, ship.x, ship.y);
    const def = ENEMY.drone;
    this.vx += Math.cos(a) * def.speed * 2.4 * dt;
    this.vy += Math.sin(a) * def.speed * 2.4 * dt;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > def.speed) { this.vx = (this.vx / sp) * def.speed; this.vy = (this.vy / sp) * def.speed; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot = a + Math.PI / 2;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && ship.alive) {
      this.fireTimer = def.fireInterval * rand(0.85, 1.2);
      world.bullets.fireEnemy(this.x, this.y, a, def.orbSpeed, def.damage);
    }
  }
}

export class Weaver extends Base {
  constructor(x, y) { super('weaver', x, y); this.baseY = y; this.phase = rand(TAU); }

  update(dt, world) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    const def = ENEMY.weaver;
    this.phase += dt * 2.2;
    this.x -= def.speed * dt;
    this.y = this.baseY + Math.sin(this.phase) * 70;
    this.rot += dt * 1.5;
    if (this.x < -40) { this.x = VIEW_W + 30; this.baseY = rand(60, VIEW_H - 60); }
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && world.ship.alive) {
      this.fireTimer = def.fireInterval * rand(0.85, 1.2);
      const a = angleTo(this.x, this.y, world.ship.x, world.ship.y);
      for (const off of [-0.28, 0, 0.28]) {
        world.bullets.fireEnemy(this.x, this.y, a + off, def.orbSpeed, def.damage);
      }
    }
  }
}

export class Asteroid extends Base {
  constructor(x, y, scale = 1) {
    super('asteroid', x, y);
    this.radius = ENEMY.asteroid.radius * scale;
    this.hp = ENEMY.asteroid.hp * scale;
    this.maxHp = this.hp;
    const a = rand(TAU);
    this.vx = Math.cos(a) * ENEMY.asteroid.speed;
    this.vy = Math.sin(a) * ENEMY.asteroid.speed;
    this.verts = [];
    const n = randi(8, 11);
    for (let i = 0; i < n; i++) {
      this.verts.push(rand(0.72, 1.15));
    }
  }

  update(dt) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.rot += this.rotSpeed * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -50) this.x = VIEW_W + 40;
    if (this.x > VIEW_W + 50) this.x = -40;
    if (this.y < -50) this.y = VIEW_H + 40;
    if (this.y > VIEW_H + 50) this.y = -40;
  }
}

export class Rock extends Base {
  constructor(x, y) {
    super('rock', x, y);
    const a = rand(TAU);
    this.vx = Math.cos(a) * ENEMY.rock.speed;
    this.vy = Math.sin(a) * ENEMY.rock.speed;
    this.verts = [];
    const n = randi(7, 9);
    for (let i = 0; i < n; i++) this.verts.push(rand(0.7, 1.15));
  }

  update(dt) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.rot += this.rotSpeed * dt * 1.6;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -30) this.x = VIEW_W + 20;
    if (this.x > VIEW_W + 30) this.x = -20;
    if (this.y < -30) this.y = VIEW_H + 20;
    if (this.y > VIEW_H + 30) this.y = -20;
  }
}

export class Marauder extends Base {
  constructor(x, y) {
    super('marauder', x, y);
    this.burstTimer = 2.5;
    this.spawnTimer = 6;
  }

  update(dt, world) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    const ship = world.ship;
    const def = ENEMY.marauder;
    const a = angleTo(this.x, this.y, ship.x, ship.y);
    this.vx += Math.cos(a) * def.speed * 1.6 * dt;
    this.vy += Math.sin(a) * def.speed * 1.6 * dt;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > def.speed) { this.vx = (this.vx / sp) * def.speed; this.vy = (this.vy / sp) * def.speed; }
    this.x = clamp(this.x + this.vx * dt, 70, VIEW_W - 70);
    this.y = clamp(this.y + this.vy * dt, 70, VIEW_H - 70);
    this.rot += dt * 0.6;
    // Aimed triple shot.
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && ship.alive) {
      this.fireTimer = def.fireInterval;
      for (const off of [-0.16, 0, 0.16]) {
        world.bullets.fireEnemy(this.x, this.y, a + off, def.orbSpeed, def.damage);
      }
    }
    // Radial burst.
    this.burstTimer -= dt;
    if (this.burstTimer <= 0 && ship.alive) {
      this.burstTimer = 2.6;
      for (let i = 0; i < 10; i++) {
        world.bullets.fireEnemy(this.x, this.y, (i / 10) * TAU + this.rot, def.orbSpeed * 0.8, def.damage);
      }
      world.audio.boss();
    }
    // Calls in a drone escort now and then.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 7;
      world.field.spawnOne('drone', this.x + rand(-60, 60), this.y + rand(-60, 60));
    }
  }
}

/** Owns the enemy list, the spawn queue and the death payouts. */
export class EnemyField {
  constructor() {
    this.list = [];
    this.queue = [];   // {kind, delay}
    this.queueTimer = 0;
  }

  reset() {
    this.list.length = 0;
    this.queue.length = 0;
    this.queueTimer = 0;
  }

  spawnOne(kind, x, y) {
    const Cls = { drone: Drone, weaver: Weaver, asteroid: Asteroid, rock: Rock, marauder: Marauder }[kind];
    this.list.push(new Cls(x, y));
  }

  /** Lay out a wave: enemies trickle in from the edges over a few seconds. */
  startWave(comp) {
    this.queue.length = 0;
    const kinds = [];
    for (let i = 0; i < comp.drones; i++) kinds.push('drone');
    for (let i = 0; i < comp.weavers; i++) kinds.push('weaver');
    for (let i = 0; i < comp.asteroids; i++) kinds.push('asteroid');
    // Shuffle so the mix is not predictable.
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    kinds.forEach((kind, i) => this.queue.push({ kind, delay: 0.4 + i * 0.55 }));
    if (comp.marauder) this.queue.push({ kind: 'marauder', delay: 0.4 + kinds.length * 0.55 + 1.5 });
    this.queueTimer = 0;
  }

  edgePoint() {
    const side = randi(0, 3);
    if (side === 0) return { x: rand(VIEW_W), y: -30 };
    if (side === 1) return { x: VIEW_W + 30, y: rand(VIEW_H) };
    if (side === 2) return { x: rand(VIEW_W), y: VIEW_H + 30 };
    return { x: -30, y: rand(VIEW_H) };
  }

  update(dt, world) {
    this.queueTimer += dt;
    while (this.queue.length > 0 && this.queue[0].delay <= this.queueTimer) {
      const { kind } = this.queue.shift();
      // Weavers always enter from the right and sweep left; the boss drops in from the top.
      const p = kind === 'marauder'
        ? { x: VIEW_W / 2, y: -60 }
        : kind === 'weaver'
          ? { x: VIEW_W + 30, y: rand(60, VIEW_H - 60) }
          : this.edgePoint();
      this.spawnOne(kind, p.x, p.y);
    }
    for (const e of this.list) e.update(dt, world);
  }

  /** Remove a dead enemy, pay out its score and salvage, and split asteroids. */
  kill(e, world) {
    const idx = this.list.indexOf(e);
    if (idx >= 0) this.list.splice(idx, 1);
    world.particles.burst(e.x, e.y, e.kind === 'asteroid' || e.kind === 'rock' ? '#c9b8a3' : PALETTE[e.kind] || '#ffffff', e.kind === 'marauder' ? 46 : 20, e.kind === 'marauder' ? 380 : 260);
    world.particles.ring(e.x, e.y, '#ffffff', e.kind === 'marauder' ? 110 : 46);
    world.salvage.spawn(e.x, e.y, e.salvage, 1);
    if (e.kind === 'asteroid') {
      world.audio.rockDie();
      this.spawnOne('rock', e.x - 12, e.y);
      this.spawnOne('rock', e.x + 12, e.y);
    } else {
      world.audio.enemyDie();
    }
    return e.score;
  }

  draw(ctx) {
    for (const e of this.list) drawEnemy(ctx, e);
  }
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0;
  if (e.kind === 'drone') {
    ctx.rotate(e.rot);
    ctx.shadowBlur = 12;
    ctx.shadowColor = PALETTE.drone;
    ctx.fillStyle = flash ? '#ffffff' : PALETTE.drone;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(13, -10);
    ctx.lineTo(0, -4);
    ctx.lineTo(-13, -10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a001f';
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, TAU);
    ctx.fill();
  } else if (e.kind === 'weaver') {
    ctx.rotate(e.rot);
    ctx.shadowBlur = 12;
    ctx.shadowColor = PALETTE.weaver;
    ctx.fillStyle = flash ? '#ffffff' : PALETTE.weaver;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1c0033';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, TAU);
    ctx.fill();
  } else if (e.kind === 'asteroid' || e.kind === 'rock') {
    ctx.rotate(e.rot);
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#000000';
    ctx.fillStyle = flash ? '#ffffff' : PALETTE.rock;
    ctx.strokeStyle = '#5d4f42';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const n = e.verts.length;
    for (let i = 0; i <= n; i++) {
      const a = (i % n) / n * TAU;
      const r = e.radius * e.verts[i % n];
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(-e.radius * 0.25, -e.radius * 0.2, e.radius * 0.22, 0, TAU);
    ctx.arc(e.radius * 0.3, e.radius * 0.25, e.radius * 0.16, 0, TAU);
    ctx.fill();
  } else if (e.kind === 'marauder') {
    ctx.rotate(e.rot);
    ctx.shadowBlur = 18;
    ctx.shadowColor = PALETTE.marauder;
    ctx.fillStyle = flash ? '#ffffff' : PALETTE.marauder;
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(34, -18);
    ctx.lineTo(46, 10);
    ctx.lineTo(20, 34);
    ctx.lineTo(0, 22);
    ctx.lineTo(-20, 34);
    ctx.lineTo(-46, 10);
    ctx.lineTo(-34, -18);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a0500';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fill();
    // Boss health bar, drawn unrotated.
    ctx.restore();
    ctx.save();
    const w = 90;
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2 - 1, e.y - e.radius - 18, w + 2, 9);
    ctx.fillStyle = PALETTE.marauder;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 17, w * frac, 7);
    ctx.restore();
    return;
  }
  ctx.restore();
}
