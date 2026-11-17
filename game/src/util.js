// Salvage Drift — small math and random helpers shared by every module.
// No imports: every other game file builds on these.
export const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Random float in [a, b). */
export function rand(a = 1, b) {
  if (b === undefined) { b = a; a = 0; }
  return a + Math.random() * (b - a);
}

/** Random integer in [a, b] inclusive. */
export function randi(a, b) {
  return Math.floor(rand(a, b + 1));
}

/** Pick one element of an array. */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Angle from (x1, y1) to (x2, y2). */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** Squared distance (cheap collision test). */
export function dist2(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
}

/** Shorten a number for the HUD: 1250 -> "1,250". */
export function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}
