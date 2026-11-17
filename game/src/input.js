// Salvage Drift — keyboard and mouse state, read once per frame.
// Mouse coordinates are converted into the canvas's own 960x600 space,
// so the game plays the same at any window size.
import { VIEW_W, VIEW_H } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: VIEW_W / 2, y: VIEW_H / 2 - 120, down: false };
    this.clicked = false;       // a fresh mouse press, consumed by the game
    this.anyKey = false;        // a fresh key press, consumed by the game
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.anyKey = true; }
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
      this.mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
    };
    this._onMouseDown = (e) => {
      this._onMouseMove(e);
      this.mouse.down = true;
      this.clicked = true;
    };
    this._onMouseUp = () => { this.mouse.down = false; };
    this._onBlur = () => { this.keys.clear(); this.mouse.down = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  /** True once for the frame a key was pressed (call after reading). */
  takeAnyKey() {
    const v = this.anyKey;
    this.anyKey = false;
    return v;
  }

  /** True once for the frame the mouse was pressed. */
  takeClick() {
    const v = this.clicked;
    this.clicked = false;
    return v;
  }

  /** Movement vector from WASD or arrow keys, normalized. */
  moveVector() {
    let x = 0, y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y -= 1;
    if (this.down('KeyS', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }
}
