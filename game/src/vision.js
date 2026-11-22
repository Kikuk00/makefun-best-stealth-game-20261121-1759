// Vision: what a guard can see — cone shape, line of sight, and how clearly
// the courier stands out (distance, light, speed, shadow and bush cover).
import { TILE, blocksSight, tileAt } from './levels.js';

/** Angle from (x1, y1) to (x2, y2). */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** Smallest absolute difference between two angles, 0..PI. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * Line of sight between two points: sample along the segment and fail when a
 * sight-blocking tile is crossed. `ignoreBush` lets a bush hide the courier
 * without hiding the guard's own view past it — not used; bushes block both.
 */
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const col = Math.floor((x1 + dx * t) / TILE);
    const row = Math.floor((y1 + dy * t) / TILE);
    if (blocksSight(tileAt(level, col, row))) return false;
  }
  return true;
}

/** True when the point (px, py) lies inside the guard's vision cone. */
export function inVisionCone(guard, px, py, range, halfAngle) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 14) return true;
  return angleDiff(guard.facing, angleTo(guard.x, guard.y, px, py)) <= halfAngle;
}

/**
 * How visible the courier is to one guard right now, 0..1.
 * 0: out of cone, out of range, or no line of sight. Rises as the courier
 * gets closer and stands in the open; shadow and bush cover cut it hard,
 * running makes it worse, sneaking makes it better.
 */
export function visibilityTo(level, guard, player, range, halfAngle) {
  if (!inVisionCone(guard, player.x, player.y, range, halfAngle)) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const closeness = 1 - (dist / range) * 0.65;
  let v = Math.max(0.25, closeness);
  if (player.inBush) return 0;
  if (player.inShadow) v *= 0.22;
  if (player.moving === 'run') v *= 1.5;
  if (player.moving === 'sneak') v *= 0.55;
  return Math.min(1, v);
}

/**
 * The polygon of a guard's cone, clipped where walls cut it: march rays across
 * the cone and stop each one at the first sight-blocking tile, so the drawn
 * cone hugs the crates and walls instead of shining through them.
 */
export function conePolygon(level, guard, range, halfAngle, rays = 26) {
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = guard.facing - halfAngle + (2 * halfAngle * i) / rays;
    let r = range;
    const step = TILE / 3;
    for (let d = step; d <= range; d += step) {
      const x = guard.x + Math.cos(a) * d;
      const y = guard.y + Math.sin(a) * d;
      if (blocksSight(tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE)))) {
        r = d;
        break;
      }
    }
    points.push({ x: guard.x + Math.cos(a) * r, y: guard.y + Math.sin(a) * r });
  }
  return points;
}
