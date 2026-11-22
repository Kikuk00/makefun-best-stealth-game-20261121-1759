// Game state: screens, the detection meter, noise, scoring and win/lose.
// Owns the level, the courier, the guards and the rules that tie them together.
import { LEVELS, TILE, COLS, ROWS, findTiles, tileCentre, reachableTiles } from './levels.js';
import { Guard, GUARD_ALERTED, GUARD_SUSPICIOUS, GUARD_CALM } from './guards.js';
import { Player } from './player.js';
import { visibilityTo } from './vision.js';
import { SoundFX } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_DONE = 'levelDone';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

const DETECTION_FILL_RATE = 78;
const DETECTION_DRAIN_RATE = 26;
const SUSPICIOUS_AT = 34;
const NOISE_HEAR_RADIUS = 150;
const CATCH_RADIUS = 17;

/** Deterministic RNG (mulberry32) so decor and screenshots are stable. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Game {
  constructor() {
    this.sound = new SoundFX();
    this.levelIndex = 0;
    this.screen = SCREEN_TITLE;
    this.time = 0;
    this.score = 0;
    this.elapsed = 0;
    this.detection = 0;
    this.hasParcel = false;
    this.intelGot = 0;
    this.intelTotal = 0;
    this.levelBonus = 0;
    this.rings = [];
    this.flashTimer = 0;
    this.caughtBy = null;
    this.levelDef = LEVELS[0];
    this.level = LEVELS[0];
    this.player = null;
    this.guards = [];
    this.parcel = null;
    this.exit = null;
    this.intel = [];
    this.reachable = new Set();
    this.lastSeen = null;
    this.loadLevel(0);
  }

  /** Build a level's entities from its map: courier, guards, parcel, exit, intel. */
  loadLevel(index) {
    this.levelIndex = index;
    this.levelDef = LEVELS[index];
    this.level = LEVELS[index];
    this.elapsed = 0;
    this.detection = 0;
    this.hasParcel = false;
    this.intelGot = 0;
    this.rings = [];
    this.lastSeen = null;
    this.caughtBy = null;
    const start = findTiles(this.level, 'P')[0];
    const startPx = tileCentre(start.col, start.row);
    this.player = new Player(startPx.x, startPx.y);
    this.guards = this.level.guards.map((g) => new Guard(g, this.level.guardSpeed));
    const parcelTile = findTiles(this.level, 'X')[0];
    this.parcel = { ...tileCentre(parcelTile.col, parcelTile.row), taken: false };
    const exitTile = findTiles(this.level, 'E')[0];
    this.exit = { ...tileCentre(exitTile.col, exitTile.row) };
    this.intel = findTiles(this.level, 'i').map((t) => ({ ...tileCentre(t.col, t.row), taken: false }));
    this.intelTotal = this.intel.length;
    this.reachable = reachableTiles(this.level);
  }

  /** Any guard currently chasing the courier. */
  anyAlerted() {
    return this.guards.some((g) => g.state === GUARD_ALERTED);
  }

  /** The most suspicious guard right now, for the HUD and the cone colours. */
  topAlert() {
    if (this.anyAlerted()) return GUARD_ALERTED;
    if (this.guards.some((g) => g.state === GUARD_SUSPICIOUS)) return GUARD_SUSPICIOUS;
    return GUARD_CALM;
  }

  startGame() {
    this.score = 0;
    this.loadLevel(0);
    this.screen = SCREEN_PLAY;
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = SCREEN_WIN;
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.screen = SCREEN_PLAY;
  }

  retryLevel() {
    this.loadLevel(this.levelIndex);
    this.screen = SCREEN_PLAY;
  }

  /** A noise pulse at (x, y): guards inside the radius go check it out. */
  hearNoise(x, y, radius) {
    for (const g of this.guards) {
      if (g.state === GUARD_ALERTED) continue;
      if (Math.hypot(g.x - x, g.y - y) <= radius) g.becomeSuspicious(x, y);
    }
  }

  /** Add an expanding sound ring at (x, y) for the renderer. */
  addRing(x, y, color, maxR = 46) {
    this.rings.push({ x, y, r: 6, maxR, color, life: 1 });
  }

  /**
   * One fixed step of the play simulation. `input` is {keys, clickTarget}.
   * Returns a list of sound events for the frame ('footstep', 'alert', ...).
   */
  step(dt, input) {
    this.time += dt;
    const events = [];
    if (this.screen !== SCREEN_PLAY) return events;
    this.elapsed += dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    // Move the courier; running is loud enough for nearby guards to hear.
    const { noisePulse } = this.player.update(this.level, dt, input.keys, input.clickTarget);
    if (noisePulse) {
      this.addRing(this.player.x, this.player.y, 'rgba(255, 200, 90, 0.8)', NOISE_HEAR_RADIUS);
      this.hearNoise(this.player.x, this.player.y, NOISE_HEAR_RADIUS);
      events.push('playerStep');
    }

    // Detection: the clearest view any guard has of the courier right now.
    let bestVisibility = 0;
    let bestGuard = null;
    for (const g of this.guards) {
      const v = visibilityTo(this.level, g, this.player, this.level.coneRange, 0.62);
      if (v > bestVisibility) {
        bestVisibility = v;
        bestGuard = g;
      }
    }
    if (bestVisibility > 0) {
      this.detection = Math.min(100, this.detection + DETECTION_FILL_RATE * bestVisibility * dt);
      this.lastSeen = { x: this.player.x, y: this.player.y };
      if (this.detection >= SUSPICIOUS_AT && bestGuard.state === GUARD_CALM) {
        bestGuard.becomeSuspicious(this.player.x, this.player.y);
        events.push('suspicious');
      }
      if (this.detection >= 100 && bestGuard.state !== GUARD_ALERTED) {
        for (const g of this.guards) g.becomeAlerted(this.player.x, this.player.y);
        this.flashTimer = 0.4;
        events.push('alert');
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECTION_DRAIN_RATE * dt);
    }

    // Guards move; an alerted guard that reaches the courier catches them.
    for (const g of this.guards) {
      const chaseTarget = g.state === GUARD_ALERTED && bestVisibility > 0
        ? { x: this.player.x, y: this.player.y }
        : g.state === GUARD_ALERTED ? null : null;
      const stepped = g.update(this.level, dt, chaseTarget);
      if (stepped) {
        const close = Math.hypot(g.x - this.player.x, g.y - this.player.y) < 190;
        this.addRing(g.x, g.y, g.state === GUARD_ALERTED ? 'rgba(255, 70, 50, 0.85)' : 'rgba(200, 210, 230, 0.45)', 26);
        events.push(close ? 'footstepClose' : 'footstep');
      }
      if (g.state === GUARD_ALERTED && Math.hypot(g.x - this.player.x, g.y - this.player.y) < CATCH_RADIUS) {
        this.caughtBy = g;
        this.screen = SCREEN_CAUGHT;
        events.push('caught');
        return events;
      }
    }

    // Pickups: intel pages, then the parcel.
    for (const page of this.intel) {
      if (!page.taken && Math.hypot(page.x - this.player.x, page.y - this.player.y) < 22) {
        page.taken = true;
        this.intelGot += 1;
        this.score += 150;
        events.push('pickup');
      }
    }
    if (!this.parcel.taken && Math.hypot(this.parcel.x - this.player.x, this.parcel.y - this.player.y) < 24) {
      this.parcel.taken = true;
      this.hasParcel = true;
      this.score += 250;
      events.push('pickup');
    }

    // Exit: only with the parcel in hand.
    if (this.hasParcel && Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y) < 26) {
      this.levelBonus = Math.max(0, 600 - Math.floor(this.elapsed) * 4);
      this.score += this.levelBonus;
      this.screen = this.levelIndex + 1 >= LEVELS.length ? SCREEN_WIN : SCREEN_LEVEL_DONE;
      events.push('win');
    }

    // Sound rings fade and grow.
    for (const ring of this.rings) {
      ring.r += 90 * dt;
      ring.life -= dt * 1.6;
    }
    this.rings = this.rings.filter((r) => r.life > 0 && r.r < r.maxR);
    return events;
  }

  /** Route sound events from step() to the synthesiser. */
  playEvents(events) {
    for (const e of events) {
      if (e === 'footstep') this.sound.footstep(false);
      if (e === 'footstepClose') this.sound.footstep(true);
      if (e === 'playerStep') this.sound.playerStep();
      if (e === 'suspicious') this.sound.suspiciousBlip();
      if (e === 'alert') this.sound.alertSting();
      if (e === 'pickup') this.sound.pickup();
      if (e === 'win') this.sound.winJingle();
      if (e === 'caught') this.sound.caughtDrone();
    }
  }
}

export { COLS, ROWS, TILE };
