// Guards: patrol routes you can learn, and three alert states.
// calm — walks the patrol, pauses at each waypoint, looks around.
// suspicious — saw something or heard a noise; walks to the spot to check.
// alerted — the courier is spotted; chases, and calls the others in.
import { TILE, blocksMovement, tileAt, tileCentre } from './levels.js';
import { angleTo, angleDiff } from './vision.js';

export const GUARD_CALM = 'calm';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERTED = 'alerted';
export const CONE_HALF_ANGLE = 0.62;

/** A guard on patrol. `patrol` is {waypoints: [[col,row]...], pause}. */
export class Guard {
  constructor(patrolDef, speed) {
    const start = tileCentre(patrolDef.waypoints[0][0], patrolDef.waypoints[0][1]);
    this.x = start.x;
    this.y = start.y;
    this.waypoints = patrolDef.waypoints.map(([c, r]) => tileCentre(c, r));
    this.pauseAtWaypoint = patrolDef.pause;
    this.speed = speed;
    this.targetIndex = 1 % this.waypoints.length;
    this.pauseTimer = 0.6;
    this.facing = Math.PI / 2;
    this.state = GUARD_CALM;
    this.stateTimer = 0;
    this.investigateX = 0;
    this.investigateY = 0;
    this.stepTimer = 0;
    this.stepPhase = 0;
    this.caughtPlayer = false;
  }

  /** Where the guard is heading right now, for the patrol / chase logic. */
  currentTarget() {
    if (this.state === GUARD_ALERTED) return { x: this.investigateX, y: this.investigateY };
    if (this.state === GUARD_SUSPICIOUS) return { x: this.investigateX, y: this.investigateY };
    return this.waypoints[this.targetIndex];
  }

  /** Become suspicious of a spot: walk there and look around. */
  becomeSuspicious(x, y) {
    if (this.state === GUARD_ALERTED) return;
    this.state = GUARD_SUSPICIOUS;
    this.investigateX = x;
    this.investigateY = y;
    this.stateTimer = 0;
  }

  /** Go fully alerted and chase the courier's position. */
  becomeAlerted(x, y) {
    this.state = GUARD_ALERTED;
    this.investigateX = x;
    this.investigateY = y;
    this.stateTimer = 0;
  }

  /** Drop back to the patrol route, from the nearest waypoint. */
  calmDown() {
    this.state = GUARD_CALM;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.waypoints.length; i += 1) {
      const d = Math.hypot(this.waypoints[i].x - this.x, this.waypoints[i].y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    this.targetIndex = best;
    this.pauseTimer = 0;
  }

  /** Move toward (tx, ty) at `speed`, sliding along walls; returns distance left. */
  moveToward(level, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return 0;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    this.facing = angleTo(this.x, this.y, tx, ty);
    if (!hitsWall(level, nx, this.y, 11)) this.x = nx;
    if (!hitsWall(level, this.x, ny, 11)) this.y = ny;
    return Math.hypot(tx - this.x, ty - this.y);
  }

  /** One simulation step. Returns true when a footstep sound should ring. */
  update(level, dt, chaseTarget) {
    let stepped = false;
    if (this.state === GUARD_ALERTED) {
      // Chase the courier; give up after 5 s without a fresh sighting.
      this.stateTimer += dt;
      if (chaseTarget) {
        this.investigateX = chaseTarget.x;
        this.investigateY = chaseTarget.y;
        this.stateTimer = 0;
      }
      const left = this.moveToward(level, this.investigateX, this.investigateY, this.speed * 2.05, dt);
      stepped = true;
      if (this.stateTimer > 5) this.becomeSuspicious(this.investigateX, this.investigateY);
      if (left < 10 && !chaseTarget) this.becomeSuspicious(this.investigateX, this.investigateY);
    } else if (this.state === GUARD_SUSPICIOUS) {
      const left = this.moveToward(level, this.investigateX, this.investigateY, this.speed * 1.25, dt);
      stepped = true;
      if (left < 12) {
        // Arrived: scan the area, then give up and go back to patrol.
        this.stateTimer += dt;
        this.facing += dt * 1.6;
        if (this.stateTimer > 2.2) this.calmDown();
      } else {
        this.stateTimer = 0;
      }
    } else {
      if (this.pauseTimer > 0) {
        // Paused at a waypoint: look left and right, the way a guard does.
        this.pauseTimer -= dt;
        this.facing += Math.sin(this.stateTimer * 1.4) * dt * 0.9;
        this.stateTimer += dt;
      } else {
        const target = this.waypoints[this.targetIndex];
        const left = this.moveToward(level, target.x, target.y, this.speed, dt);
        stepped = true;
        if (left < 6) {
          this.targetIndex = (this.targetIndex + 1) % this.waypoints.length;
          this.pauseTimer = this.pauseAtWaypoint;
          this.stateTimer = 0;
        }
      }
    }
    if (stepped) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.42;
        this.stepPhase += 1;
        return true;
      }
    }
    return false;
  }
}

/** True when a circle of radius r at (x, y) overlaps a movement-blocking tile. */
export function hitsWall(level, x, y, r) {
  const c0 = Math.floor((x - r) / TILE);
  const c1 = Math.floor((x + r) / TILE);
  const r0 = Math.floor((y - r) / TILE);
  const r1 = Math.floor((y + r) / TILE);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      if (!blocksMovement(tileAt(level, col, row))) continue;
      const bx = Math.max(col * TILE, Math.min(x, (col + 1) * TILE));
      const by = Math.max(row * TILE, Math.min(y, (row + 1) * TILE));
      if ((x - bx) * (x - bx) + (y - by) * (y - by) < r * r) return true;
    }
  }
  return false;
}

/** The nearest guard to a point, and how far away it is. */
export function nearestGuard(guards, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const g of guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return { guard: best, dist: bestDist };
}
