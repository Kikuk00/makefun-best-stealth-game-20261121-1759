// The courier: WASD/arrows to move, Shift to run (fast but loud), C or Ctrl to
// sneak (slow and quiet), click to walk to a spot. Running leaves noise rings
// guards can hear; sneaking and shadow keep the detection meter down.
import { TILE, tileAt } from './levels.js';
import { hitsWall } from './guards.js';

export const WALK_SPEED = 112;
export const RUN_SPEED = 178;
export const SNEAK_SPEED = 64;
export const PLAYER_RADIUS = 11;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.facing = -Math.PI / 2;
    this.moving = 'still';
    this.inShadow = false;
    this.inBush = false;
    this.noiseTimer = 0;
    this.stepTimer = 0;
    this.clickTarget = null;
  }

  /** Speed for the current stance. */
  speed() {
    if (this.moving === 'run') return RUN_SPEED;
    if (this.moving === 'sneak') return SNEAK_SPEED;
    return WALK_SPEED;
  }

  /** Where the player stands: shadow pool, bush, or open lit floor. */
  updateGround(level) {
    const ch = tileAt(level, Math.floor(this.x / TILE), Math.floor(this.y / TILE));
    this.inShadow = ch === 's';
    this.inBush = ch === 'B';
  }

  /**
   * Move from keyboard input (dx, dy in -1..1) or toward a click target.
   * Returns 'run' | 'walk' | 'sneak' | 'still' and, when running, whether a
   * noise pulse should go out this step.
   */
  update(level, dt, keys, clickTarget) {
    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (dx === 0 && dy === 0 && clickTarget) {
      const cx = clickTarget.x - this.x;
      const cy = clickTarget.y - this.y;
      const d = Math.hypot(cx, cy);
      if (d > 8) {
        dx = cx / d;
        dy = cy / d;
      } else {
        this.clickTarget = null;
      }
    }
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      this.facing = Math.atan2(dy, dx);
    }
    const running = keys.run && len > 0;
    const sneaking = keys.sneak && len > 0 && !running;
    this.moving = len === 0 ? 'still' : running ? 'run' : sneaking ? 'sneak' : 'walk';
    const speed = this.speed() * (this.inBush ? 0.7 : 1);
    const step = speed * dt;
    const nx = this.x + dx * step;
    const ny = this.y + dy * step;
    if (len > 0) {
      if (!hitsWall(level, nx, this.y, PLAYER_RADIUS)) this.x = nx;
      if (!hitsWall(level, this.x, ny, PLAYER_RADIUS)) this.y = ny;
    }
    this.updateGround(level);
    let noisePulse = false;
    if (this.moving === 'run') {
      this.noiseTimer -= dt;
      if (this.noiseTimer <= 0) {
        this.noiseTimer = 0.34;
        noisePulse = true;
      }
    }
    if (len > 0) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.moving === 'run' ? 0.26 : 0.4;
      }
    }
    return { noisePulse };
  }
}
