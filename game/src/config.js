// Salvage Drift — every tunable number in one place: palette, ship, enemies,
// waves and the upgrade pool. Nothing here imports anything else.
import { randi } from './util.js';

export const VIEW_W = 960;
export const VIEW_H = 600;

export const PALETTE = {
  bg0: '#04060f',
  bg1: '#0a1030',
  star: '#cfe4ff',
  ship: '#39e6ff',
  shipDark: '#0e7ea6',
  bullet: '#8ef6ff',
  drone: '#ff4fd8',
  weaver: '#b26bff',
  rock: '#9c8a7a',
  marauder: '#ff5a3c',
  salvage: '#ffb347',
  salvageCore: '#fff3c4',
  enemyOrb: '#ff7ad9',
  hud: '#d8f6ff',
  hudDim: '#7fa8c9',
  good: '#5cff9d',
  bad: '#ff5a5a',
  card: '#101a3a',
  cardEdge: '#2e4a7a',
  gold: '#ffd166',
};

export const PLAYER = {
  radius: 14,
  accel: 1500,
  maxSpeed: 320,
  drag: 0.90,          // per-frame velocity retention at 60fps, scaled by dt
  hull: 100,
  fireInterval: 0.16,  // seconds between shots
  bulletSpeed: 560,
  bulletDamage: 12,
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnTime: 1.0,     // seconds of protection after a hit
  magnetRadius: 90,
};

export const ENEMY = {
  drone:    { hp: 22,  speed: 115, radius: 15, score: 50,  salvage: 2, fireInterval: 2.2, orbSpeed: 170, damage: 8,  contact: 10 },
  weaver:   { hp: 30,  speed: 95,  radius: 16, score: 80,  salvage: 3, fireInterval: 2.8, orbSpeed: 150, damage: 8,  contact: 12 },
  asteroid: { hp: 46,  speed: 55,  radius: 30, score: 60,  salvage: 4, fireInterval: 0,   orbSpeed: 0,   damage: 0,  contact: 14 },
  rock:     { hp: 12,  speed: 90,  radius: 12, score: 20,  salvage: 1, fireInterval: 0,   orbSpeed: 0,   damage: 0,  contact: 8 },
  marauder: { hp: 520, speed: 42,  radius: 46, score: 800, salvage: 25, fireInterval: 1.6, orbSpeed: 200, damage: 12, contact: 20 },
};

export const SALVAGE_VALUE = 25;   // credits per shard
export const WAVE_CLEAR_BONUS = 150;

/** What a wave brings. Wave n grows in count and mixes in weavers, then a boss every 5th. */
export function waveComp(n) {
  const drones = 4 + n * 2;
  const weavers = n >= 2 ? 1 + Math.floor(n * 0.8) : 0;
  const asteroids = 2 + Math.floor(n * 0.7);
  const marauder = n % 5 === 0;
  return { drones, weavers, asteroids, marauder };
}

/** The upgrade pool. `max` is how many times it can be taken; `apply` mutates the ship. */
export const UPGRADES = [
  { id: 'rapid',   name: 'Rapid Cycler',   desc: 'Fire 25% faster.',                 max: 4, apply: (s) => { s.fireInterval *= 0.8; } },
  { id: 'twin',    name: 'Twin Mount',     desc: '+1 projectile per shot.',         max: 3, apply: (s) => { s.shots += 1; } },
  { id: 'magnet',  name: 'Tractor Array',  desc: '+60% salvage pickup radius.',     max: 3, apply: (s) => { s.magnetRadius *= 1.6; } },
  { id: 'aegis',   name: 'Aegis Shield',   desc: 'Block one hit; recharges each wave.', max: 2, apply: (s) => { s.shields += 1; s.maxShields += 1; } },
  { id: 'hull',    name: 'Hull Plating',   desc: '+30 max hull and repair 30.',     max: 4, apply: (s) => { s.maxHull += 30; s.hull = Math.min(s.maxHull, s.hull + 30); } },
  { id: 'dash',    name: 'Ion Dash',       desc: 'Dash recharges 40% faster.',       max: 3, apply: (s) => { s.dashCooldown *= 0.6; } },
  { id: 'pierce',  name: 'Piercing Rounds', desc: 'Shots pierce +1 enemy.',          max: 2, apply: (s) => { s.pierce += 1; } },
  { id: 'refine',  name: 'Refinery',       desc: 'Salvage is worth +25%.',           max: 3, apply: (s) => { s.salvageMul *= 1.25; } },
  { id: 'power',   name: 'Heavy Rounds',   desc: '+35% bullet damage.',              max: 4, apply: (s) => { s.bulletDamage *= 1.35; } },
];

/** Draft `count` distinct upgrades the player has not maxed out. */
export function draftUpgrades(owned, count = 3) {
  const pool = UPGRADES.filter((u) => (owned[u.id] || 0) < u.max);
  const out = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(randi(0, pool.length - 1), 1)[0]);
  }
  return out;
}
