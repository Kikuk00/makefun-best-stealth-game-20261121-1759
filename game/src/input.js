// Keyboard and mouse input: WASD/arrows to move, Shift to run, C/Ctrl to
// sneak, R to retry, Enter/Space to advance screens, click to walk somewhere.
export class Input {
  constructor(canvas) {
    this.keys = { left: false, right: false, up: false, down: false, run: false, sneak: false };
    this.pressed = new Set();
    this.clickTarget = null;
    this.canvas = canvas;
    this.onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.keys.left = true;
      if (k === 'arrowright' || k === 'd') this.keys.right = true;
      if (k === 'arrowup' || k === 'w') this.keys.up = true;
      if (k === 'arrowdown' || k === 's') this.keys.down = true;
      if (k === 'shift') this.keys.run = true;
      if (k === 'c' || k === 'control') this.keys.sneak = true;
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
      this.pressed.add(k);
    };
    this.onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.keys.left = false;
      if (k === 'arrowright' || k === 'd') this.keys.right = false;
      if (k === 'arrowup' || k === 'w') this.keys.up = false;
      if (k === 'arrowdown' || k === 's') this.keys.down = false;
      if (k === 'shift') this.keys.run = false;
      if (k === 'c' || k === 'control') this.keys.sneak = false;
    };
    this.onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      this.clickTarget = { x: e.clientX - rect.left, y: e.clientY - rect.top, raw: true };
    };
    this.onBlur = () => {
      this.keys.left = this.keys.right = this.keys.up = this.keys.down = false;
      this.keys.run = this.keys.sneak = false;
    };
  }

  attach() {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousedown', this.onClick);
    window.addEventListener('blur', this.onBlur);
  }

  /** True once for a key pressed since the last frame (Enter, Space, R...). */
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  /** Clear the just-pressed set at the end of each frame. */
  endFrame() {
    this.pressed.clear();
  }
}
