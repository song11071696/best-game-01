// Salvage Drift — the game itself: state machine (title / playing / upgrade /
// over), the loop, collisions, the HUD, and the staged scenes the screenshots
// use. Every other module plugs in here through one shared `world` object.
import { VIEW_W, VIEW_H, PALETTE, PLAYER, waveComp, draftUpgrades, WAVE_CLEAR_BONUS } from './config.js';
import { clamp, fmt, TAU } from './util.js';
import { SoundFX } from './audio.js';
import { Input } from './input.js';
import { Particles, FloatTexts, Starfield } from './particles.js';
import { Bullets } from './bullets.js';
import { Salvage } from './salvage.js';
import { Ship } from './ship.js';
import { EnemyField } from './enemies.js';
import { drawUpgradeChoices, cardRect } from './upgrades.js';
import { panel, bar, text } from './render.js';

const BEST_KEY = 'salvage-drift-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new SoundFX();
    this.stars = new Starfield(VIEW_W, VIEW_H);
    this.particles = new Particles();
    this.texts = new FloatTexts();
    this.bullets = new Bullets();
    this.salvage = new Salvage();
    this.field = new EnemyField();
    this.ship = new Ship(VIEW_W / 2, VIEW_H / 2 + 80);
    this.world = {
      input: this.input,
      audio: this.audio,
      particles: this.particles,
      bullets: this.bullets,
      salvage: this.salvage,
      field: this.field,
      ship: this.ship,
    };
    this.state = 'title';
    this.time = 0;
    this.score = 0;
    this.salvageCount = 0;
    this.kills = 0;
    this.wave = 0;
    this.owned = {};
    this.choices = [];
    this.banner = null;   // { text, sub, t, max }
    this.shake = 0;
    this.flash = 0;
    this.paused = false;
    this.best = 0;
    try { this.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { this.best = 0; }
    this.stageScene(new URLSearchParams(window.location.search).get('scene'));
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      this.time += dt;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---------- flow ----------

  startRun() {
    this.ship.reset(VIEW_W / 2, VIEW_H / 2 + 80);
    this.bullets.reset();
    this.salvage.reset();
    this.field.reset();
    this.particles.list.length = 0;
    this.texts.list.length = 0;
    this.score = 0;
    this.salvageCount = 0;
    this.kills = 0;
    this.wave = 0;
    this.owned = {};
    this.choices = [];
    this.paused = false;
    this.state = 'playing';
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    const comp = waveComp(n);
    this.field.startWave(comp);
    this.banner = { text: `WAVE ${n}`, sub: comp.marauder ? 'WARNING — MARAUDER SIGNATURE DETECTED' : `${comp.drones + comp.weavers + comp.asteroids} hostiles inbound`, t: 2.2, max: 2.2 };
    if (comp.marauder) this.audio.boss();
    else this.audio.wave();
  }

  onWaveClear() {
    this.score += WAVE_CLEAR_BONUS;
    this.texts.add(VIEW_W / 2, VIEW_H / 2 - 40, `WAVE BONUS +${WAVE_CLEAR_BONUS}`, PALETTE.gold, 20);
    this.choices = draftUpgrades(this.owned, 3);
    if (this.choices.length === 0) {
      this.startWave(this.wave + 1);
      return;
    }
    this.state = 'upgrade';
    this.audio.upgrade();
  }

  chooseUpgrade(i) {
    const u = this.choices[i];
    if (!u) return;
    this.owned[u.id] = (this.owned[u.id] || 0) + 1;
    u.apply(this.ship);
    if (u.id === 'aegis') this.ship.shields = this.ship.maxShields;
    this.audio.upgrade();
    this.particles.ring(this.ship.x, this.ship.y, PALETTE.gold, 70);
    this.startWave(this.wave + 1);
    this.state = 'playing';
  }

  gameOver() {
    this.state = 'over';
    this.audio.over();
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem(BEST_KEY, String(this.best)); } catch (e) { /* private mode */ }
    }
  }

  // ---------- update ----------

  update(dt) {
    this.stars.update(dt, this.state === 'playing' ? 1.6 : 0.7);
    this.particles.update(dt);
    this.texts.update(dt);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.shake = Math.max(0, this.shake - dt * 26);
    this.flash = Math.max(0, this.flash - dt * 2.2);

    // Mute works everywhere.
    if (this.input.down('KeyM') && !this._mDown) {
      this._mDown = true;
      this.audio.toggleMute();
    }
    if (!this.input.down('KeyM')) this._mDown = false;

    if (this.state === 'title') {
      if (this.input.takeClick() || this.input.takeAnyKey()) {
        this.audio.ensure();
        this.startRun();
      }
      this.input.takeClick();
      return;
    }

    if (this.state === 'over') {
      if (this.input.takeClick() || this.input.down('KeyR') || this.input.down('Enter')) {
        this.audio.ensure();
        this.startRun();
      }
      this.input.takeClick();
      return;
    }

    if (this.state === 'upgrade') {
      if (this.input.down('Digit1')) { this.chooseUpgrade(0); return; }
      if (this.input.down('Digit2')) { this.chooseUpgrade(1); return; }
      if (this.input.down('Digit3')) { this.chooseUpgrade(2); return; }
      if (this.input.takeClick()) {
        this.audio.ensure();
        const m = this.input.mouse;
        for (let i = 0; i < this.choices.length; i++) {
          const r = cardRect(i, this.choices.length);
          if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
            this.chooseUpgrade(i);
            return;
          }
        }
      }
      return;
    }

    // Playing.
    if (this.input.down('KeyP') && !this._pDown) {
      this._pDown = true;
      this.paused = !this.paused;
    }
    if (!this.input.down('KeyP')) this._pDown = false;
    if (this.paused) {
      if (this.input.takeClick() || this.input.takeAnyKey()) this.audio.ensure();
      return;
    }

    this.ship.update(dt, this.world);
    this.field.update(dt, this.world);
    this.bullets.update(dt, VIEW_W, VIEW_H);
    const earned = this.salvage.update(dt, this.ship, this.world);
    if (earned > 0) {
      this.score += Math.round(earned * this.ship.salvageMul);
      this.salvageCount += 1;
    }
    this.collide();

    if (!this.ship.alive) {
      this.gameOver();
      return;
    }
    if (this.field.list.length === 0 && this.field.queue.length === 0) {
      this.onWaveClear();
    }
  }

  collide() {
    const ship = this.ship;
    // Player shots vs enemies.
    for (let bi = this.bullets.player.length - 1; bi >= 0; bi--) {
      const b = this.bullets.player[bi];
      let consumed = false;
      for (let ei = this.field.list.length - 1; ei >= 0; ei--) {
        const e = this.field.list[ei];
        if (b.hit.has(e)) continue;
        const rr = (b.r + e.radius) * (b.r + e.radius);
        const dx = b.x - e.x, dy = b.y - e.y;
        if (dx * dx + dy * dy < rr) {
          e.hurt(b.damage);
          this.particles.add(b.x, b.y, { vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.25, size: 2.5, color: '#ffffff' });
          if (b.pierce > 0) {
            b.hit.add(e);
            b.pierce -= 1;
          } else {
            consumed = true;
          }
          if (e.dead) {
            this.score += this.field.kill(e, this.world);
            this.kills += 1;
            this.texts.add(e.x, e.y, `+${e.score}`, PALETTE.gold, 14);
            this.shake = Math.min(10, this.shake + (e.kind === 'marauder' ? 9 : 3));
          }
          break;
        }
      }
      if (consumed) this.bullets.player.splice(bi, 1);
    }
    // Enemy orbs vs the ship.
    for (let i = this.bullets.enemy.length - 1; i >= 0; i--) {
      const b = this.bullets.enemy[i];
      const rr = (b.r + ship.radius - 2) * (b.r + ship.radius - 2);
      const dx = b.x - ship.x, dy = b.y - ship.y;
      if (dx * dx + dy * dy < rr) {
        this.bullets.enemy.splice(i, 1);
        if (ship.takeHit(b.damage, this.world)) {
          this.shake = Math.min(12, this.shake + 6);
          this.flash = 0.55;
        }
      }
    }
    // Bodies vs the ship (ramming hurts both).
    for (let ei = this.field.list.length - 1; ei >= 0; ei--) {
      const e = this.field.list[ei];
      const rr = (e.radius + ship.radius - 2) * (e.radius + ship.radius - 2);
      const dx = e.x - ship.x, dy = e.y - ship.y;
      if (dx * dx + dy * dy < rr) {
        const hurt = ship.takeHit(e.kind === 'marauder' ? 20 : (e.kind === 'asteroid' || e.kind === 'rock' ? 14 : 10), this.world);
        if (hurt) {
          this.shake = Math.min(12, this.shake + 7);
          this.flash = 0.55;
          e.hurt(40);
          e.x += dx * 0.6;
          e.y += dy * 0.6;
          if (e.dead) {
            this.score += this.field.kill(e, this.world);
            this.kills += 1;
          }
        }
      }
    }
  }

  // ---------- render ----------

  render() {
    const ctx = this.ctx;
    ctx.save();
    // Screen shake.
    if (this.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    // Space.
    const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    bg.addColorStop(0, PALETTE.bg1);
    bg.addColorStop(1, PALETTE.bg0);
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    this.stars.draw(ctx, this.time);

    this.salvage.draw(ctx, this.time);
    this.field.draw(ctx);
    this.bullets.draw(ctx);
    this.ship.draw(ctx, this.time);
    this.particles.draw(ctx);
    this.texts.draw(ctx);

    if (this.state === 'playing' || this.state === 'upgrade') this.drawHUD(ctx);
    if (this.banner) this.drawBanner(ctx);
    if (this.state === 'title') this.drawTitle(ctx);
    if (this.state === 'upgrade') drawUpgradeChoices(ctx, this.choices, this.input.mouse, this.time);
    if (this.state === 'over') this.drawGameOver(ctx);
    if (this.paused && this.state === 'playing') {
      ctx.fillStyle = 'rgba(3, 6, 18, 0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSED', VIEW_W / 2, VIEW_H / 2 - 8, { font: '700 40px "Segoe UI", system-ui, sans-serif', color: PALETTE.hud, align: 'center' });
      text(ctx, 'Press P to resume', VIEW_W / 2, VIEW_H / 2 + 26, { font: '400 17px "Segoe UI", system-ui, sans-serif', color: PALETTE.hudDim, align: 'center' });
    }
    // Hit flash.
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 60, ${(this.flash * 0.22).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  }

  drawHUD(ctx) {
    // Top strip.
    panel(ctx, 12, 10, 250, 54, 'rgba(4, 8, 22, 0.66)');
    text(ctx, 'HULL', 24, 30, { font: '700 12px "Segoe UI", system-ui, sans-serif', color: PALETTE.hudDim });
    bar(ctx, 24, 38, 150, 10, this.ship.hull / this.ship.maxHull, this.ship.hull / this.ship.maxHull > 0.35 ? PALETTE.good : PALETTE.bad);
    text(ctx, `${Math.ceil(this.ship.hull)} / ${this.ship.maxHull}`, 182, 47, { font: '700 12px "Segoe UI", system-ui, sans-serif', color: PALETTE.hud });
    if (this.ship.maxShields > 0) {
      text(ctx, `SHIELD ${'●'.repeat(this.ship.shields)}${'○'.repeat(this.ship.maxShields - this.ship.shields)}`, 24, 58, { font: '700 12px "Segoe UI", system-ui, sans-serif', color: PALETTE.ship });
    }
    text(ctx, `SCORE  ${fmt(this.score)}`, VIEW_W / 2, 32, { font: '700 22px "Segoe UI", system-ui, sans-serif', color: '#ffffff', align: 'center' });
    text(ctx, `WAVE ${this.wave}`, VIEW_W / 2, 54, { font: '700 13px "Segoe UI", system-ui, sans-serif', color: PALETTE.gold, align: 'center' });
    panel(ctx, VIEW_W - 212, 10, 200, 54, 'rgba(4, 8, 22, 0.66)');
    text(ctx, `SALVAGE  ◆ ${this.salvageCount}`, VIEW_W - 24, 32, { font: '700 15px "Segoe UI", system-ui, sans-serif', color: PALETTE.salvage, align: 'right' });
    const dashFrac = this.ship.dashTimer <= 0 ? 1 : 1 - this.ship.dashTimer / this.ship.dashCooldown;
    text(ctx, 'DASH [SPACE]', VIEW_W - 24, 52, { font: '700 11px "Segoe UI", system-ui, sans-serif', color: PALETTE.hudDim, align: 'right' });
    bar(ctx, VIEW_W - 112, 56, 88, 6, dashFrac, dashFrac >= 1 ? PALETTE.ship : PALETTE.hudDim);
    // Bottom hint.
    text(ctx, 'WASD move  ·  mouse aim  ·  guns fire on their own  ·  SPACE dash  ·  M mute  ·  P pause', VIEW_W / 2, VIEW_H - 12, { font: '400 12px "Segoe UI", system-ui, sans-serif', color: 'rgba(127,168,201,0.75)', align: 'center' });
  }

  drawBanner(ctx) {
    const t = this.banner.t / this.banner.max;
    const alpha = Math.min(1, t * 2.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    text(ctx, this.banner.text, VIEW_W / 2, 150, { font: '700 44px "Segoe UI", system-ui, sans-serif', color: '#ffffff', align: 'center' });
    if (this.banner.sub) {
      text(ctx, this.banner.sub, VIEW_W / 2, 182, { font: '700 14px "Segoe UI", system-ui, sans-serif', color: PALETTE.gold, align: 'center' });
    }
    ctx.restore();
  }

  drawTitle(ctx) {
    ctx.fillStyle = 'rgba(3, 6, 18, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const pulse = 1 + 0.02 * Math.sin(this.time * 2.4);
    ctx.save();
    ctx.translate(VIEW_W / 2, 218);
    ctx.scale(pulse, pulse);
    ctx.shadowBlur = 26;
    ctx.shadowColor = '#1e6fd8';
    text(ctx, 'SALVAGE', 0, 0, { font: '700 74px "Segoe UI", system-ui, sans-serif', color: '#ffffff', align: 'center' });
    ctx.shadowColor = PALETTE.salvage;
    text(ctx, 'DRIFT', 0, 74, { font: '700 74px "Segoe UI", system-ui, sans-serif', color: PALETTE.salvage, align: 'center' });
    ctx.restore();
    text(ctx, 'Fly the debris field. Blast pirates and rocks, tractor in the salvage,', VIEW_W / 2, 330, { font: '400 17px "Segoe UI", system-ui, sans-serif', color: PALETTE.hud, align: 'center' });
    text(ctx, 'and draft an upgrade after every wave. How long can you keep flying?', VIEW_W / 2, 354, { font: '400 17px "Segoe UI", system-ui, sans-serif', color: PALETTE.hud, align: 'center' });
    const blink = 0.55 + 0.45 * Math.sin(this.time * 4);
    text(ctx, 'CLICK OR PRESS ENTER TO LAUNCH', VIEW_W / 2, 420, { font: '700 20px "Segoe UI", system-ui, sans-serif', color: '#ffffff', align: 'center', alpha: blink });
    text(ctx, 'WASD / arrows — fly      Mouse — aim      SPACE — dash      M — mute', VIEW_W / 2, 462, { font: '400 14px "Segoe UI", system-ui, sans-serif', color: PALETTE.hudDim, align: 'center' });
    if (this.best > 0) {
      text(ctx, `BEST SCORE  ${fmt(this.best)}`, VIEW_W / 2, 500, { font: '700 15px "Segoe UI", system-ui, sans-serif', color: PALETTE.gold, align: 'center' });
    }
  }

  drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(3, 6, 18, 0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'SIGNAL LOST', VIEW_W / 2, 210, { font: '700 58px "Segoe UI", system-ui, sans-serif', color: PALETTE.bad, align: 'center' });
    text(ctx, 'Your skiff broke apart in the drift.', VIEW_W / 2, 248, { font: '400 17px "Segoe UI", system-ui, sans-serif', color: PALETTE.hud, align: 'center' });
    panel(ctx, VIEW_W / 2 - 190, 280, 380, 108, 'rgba(4, 8, 22, 0.8)');
    text(ctx, `FINAL SCORE`, VIEW_W / 2, 312, { font: '700 13px "Segoe UI", system-ui, sans-serif', color: PALETTE.hudDim, align: 'center' });
    text(ctx, fmt(this.score), VIEW_W / 2, 348, { font: '700 36px "Segoe UI", system-ui, sans-serif', color: '#ffffff', align: 'center' });
    text(ctx, `Waves cleared: ${Math.max(0, this.wave - 1)}    Kills: ${this.kills}    Salvage: ${this.salvageCount}`, VIEW_W / 2, 372, { font: '400 14px "Segoe UI", system-ui, sans-serif', color: PALETTE.hudDim, align: 'center' });
    const isBest = this.score > 0 && this.score >= this.best;
    text(ctx, isBest ? `NEW BEST SCORE!` : `BEST  ${fmt(this.best)}`, VIEW_W / 2, 420, { font: '700 17px "Segoe UI", system-ui, sans-serif', color: PALETTE.gold, align: 'center' });
    const blink = 0.55 + 0.45 * Math.sin(this.time * 4);
    text(ctx, 'PRESS R OR CLICK TO FLY AGAIN', VIEW_W / 2, 470, { font: '700 19px "Segoe UI", system-ui, sans-serif', color: '#ffffff', align: 'center', alpha: blink });
  }

  // ---------- staged scenes for screenshots ----------

  /** Put the game in a fixed, photogenic state. Real renders of the same code. */
  stageScene(name) {
    if (!name) return;
    if (name === 'title') {
      this.state = 'title';
      return;
    }
    if (name === 'play') {
      this.startRun();
      // A lively mid-wave moment, staged deterministically.
      this.score = 1250;
      this.salvageCount = 18;
      this.kills = 23;
      this.ship.x = 330;
      this.ship.y = 380;
      this.ship.angle = -0.5;
      this.field.spawnOne('drone', 640, 180);
      this.field.spawnOne('drone', 760, 320);
      this.field.spawnOne('weaver', 700, 120);
      this.field.spawnOne('asteroid', 520, 130);
      this.field.spawnOne('asteroid', 820, 460);
      this.field.spawnOne('rock', 600, 470);
      this.salvage.spawn(420, 300, 3, 1);
      this.salvage.spawn(560, 420, 2, 1);
      for (let i = 0; i < 5; i++) {
        this.bullets.firePlayer(360 + i * 26, 360 - i * 8, -0.5, 560, 12, 0);
      }
      this.particles.burst(640, 180, PALETTE.drone, 10, 200);
      this.banner = null;
      return;
    }
    if (name === 'upgrade') {
      this.startRun();
      this.score = 2180;
      this.salvageCount = 31;
      this.wave = 3;
      this.choices = draftUpgrades({}, 3);
      this.state = 'upgrade';
      this.banner = null;
      return;
    }
    if (name === 'over') {
      this.startRun();
      this.score = 3420;
      this.kills = 41;
      this.salvageCount = 52;
      this.wave = 6;
      this.ship.alive = false;
      this.ship.hull = 0;
      this.particles.burst(this.ship.x, this.ship.y, PALETTE.ship, 30, 320);
      this.particles.ring(this.ship.x, this.ship.y, PALETTE.ship, 90);
      this.state = 'over';
      this.banner = null;
      return;
    }
  }
}

// Boot.
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game;
game.start();
