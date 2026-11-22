// Renderer: draws the night level on canvas — lit floor and dark shadow pools,
// crates and bushes to hide behind, guards with vision cones that change colour
// with suspicion, the courier, the parcel, the exit, and the title/win/caught
// screens. All art is drawn by code; there are no image files.
import { TILE, COLS, ROWS, tileAt } from './levels.js';
import { conePolygon } from './vision.js';
import { GUARD_ALERTED, GUARD_SUSPICIOUS, GUARD_CALM, CONE_HALF_ANGLE } from './guards.js';
import { mulberry32, SCREEN_TITLE, SCREEN_LEVEL_DONE, SCREEN_WIN, SCREEN_CAUGHT } from './game.js';

const LEVEL_W = COLS * TILE;
const LEVEL_H = ROWS * TILE;

/** Deterministic floor speckles so the level looks the same every run. */
const speckleRng = mulberry32(20261121);
const SPECKLES = [];
for (let i = 0; i < 260; i += 1) {
  SPECKLES.push({
    x: speckleRng() * LEVEL_W,
    y: speckleRng() * LEVEL_H,
    r: 1 + speckleRng() * 2.2,
    a: 0.04 + speckleRng() * 0.07,
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw the floor, walls, crates, bushes, shadow pools and wall trim. */
function drawLevel(ctx, game) {
  const level = game.level;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#232838';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2e3448';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y + 5, TILE, 2);
        continue;
      }
      const checker = (col + row) % 2 === 0;
      ctx.fillStyle = checker ? '#1a1e2b' : '#181c28';
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 's') {
        ctx.fillStyle = 'rgba(10, 14, 34, 0.72)';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(120, 150, 255, 0.20)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
      }
      if (ch === 'B') {
        ctx.fillStyle = '#14291a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#1d4a26';
        for (let i = 0; i < 5; i += 1) {
          const bx = x + 6 + ((i * 7 + col * 13 + row * 5) % 28);
          const by = y + 6 + ((i * 11 + row * 17 + col * 3) % 28);
          ctx.beginPath();
          ctx.arc(bx, by, 6 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#2f7a3d';
        ctx.beginPath();
        ctx.arc(x + 14, y + 14, 4, 0, Math.PI * 2);
        ctx.arc(x + 27, y + 25, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (ch === 'C') {
        ctx.fillStyle = '#4a3419';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = '#6b4c26';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 2, y + TILE - 8, TILE - 4, 6);
      }
    }
  }
  for (const s of SPECKLES) {
    ctx.fillStyle = `rgba(255, 255, 255, ${s.a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Warm lamp pools: lit floor is dangerous, shadow is safe.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (tileAt(level, col, row) !== '.') continue;
      if ((col * 7 + row * 11) % 23 !== 0) continue;
      const g = ctx.createRadialGradient(col * TILE + 20, row * TILE + 20, 4, col * TILE + 20, row * TILE + 20, 74);
      g.addColorStop(0, 'rgba(255, 190, 90, 0.10)');
      g.addColorStop(1, 'rgba(255, 190, 90, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(col * TILE - 60, row * TILE - 60, 200, 200);
    }
  }
  ctx.restore();
}

/** The parcel, the exit door and the intel pages. */
function drawObjectives(ctx, game) {
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 3.2);
  if (!game.parcel.taken) {
    const { x, y } = game.parcel;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, `rgba(255, 210, 62, ${0.5 * pulse})`);
    g.addColorStop(1, 'rgba(255, 210, 62, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 34, y - 34, 68, 68);
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(x - 11, y - 9, 22, 18);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(x - 11, y - 9, 22, 5);
    ctx.fillStyle = '#3a2f10';
    ctx.fillRect(x - 1.5, y - 9, 3, 18);
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', x, y - 22);
  }
  const ex = game.exit;
  const eg = ctx.createRadialGradient(ex.x, ex.y, 2, ex.x, ex.y, 40);
  eg.addColorStop(0, game.hasParcel ? `rgba(46, 204, 113, ${0.55 * pulse})` : 'rgba(46, 204, 113, 0.18)');
  eg.addColorStop(1, 'rgba(46, 204, 113, 0)');
  ctx.fillStyle = eg;
  ctx.fillRect(ex.x - 40, ex.y - 40, 80, 80);
  ctx.fillStyle = '#0d3b22';
  ctx.fillRect(ex.x - 14, ex.y - 16, 28, 32);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(ex.x - 14, ex.y - 16, 28, 6);
  ctx.fillStyle = '#d5f5e3';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', ex.x, ex.y + 2);
  for (const page of game.intel) {
    if (page.taken) continue;
    const bob = Math.sin(game.time * 2 + page.x) * 2;
    ctx.fillStyle = '#f4f1e6';
    ctx.save();
    ctx.translate(page.x, page.y + bob);
    ctx.rotate(0.25);
    ctx.fillRect(-7, -9, 14, 18);
    ctx.strokeStyle = '#9a94a0';
    ctx.lineWidth = 1;
    ctx.strokeRect(-7, -9, 14, 18);
    ctx.strokeStyle = '#5a6b8a';
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, -4);
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.moveTo(-4, 4);
    ctx.lineTo(1, 4);
    ctx.stroke();
    ctx.restore();
  }
}

/** Vision cones, guards, the courier and the sound rings. */
function drawActors(ctx, game) {
  // Cones first, under the actors: yellow calm, orange suspicious, red alerted.
  for (const g of game.guards) {
    const poly = conePolygon(game.level, g, game.level.coneRange, CONE_HALF_ANGLE);
    const color = g.state === GUARD_ALERTED
      ? '255, 60, 40'
      : g.state === GUARD_SUSPICIOUS ? '255, 150, 40' : '255, 214, 64';
    ctx.fillStyle = `rgba(${color}, ${g.state === GUARD_CALM ? 0.16 : 0.26})`;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${color}, 0.35)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Sound rings: footsteps and running noise, fading as they grow.
  for (const ring of game.rings) {
    ctx.strokeStyle = ring.color;
    ctx.globalAlpha = Math.max(0, ring.life) * 0.9;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Guards: red uniform, cap, facing tick, and ? / ! over their heads.
  for (const g of game.guards) {
    const body = g.state === GUARD_ALERTED ? '#c0392b' : g.state === GUARD_SUSPICIOUS ? '#d35400' : '#8e2f27';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 9, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5d76e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#2c1a12';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 3, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(g.x - 7, g.y - 4, 14, 3);
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.facing) * 10, g.y + Math.sin(g.facing) * 10);
    ctx.lineTo(g.x + Math.cos(g.facing) * 19, g.y + Math.sin(g.facing) * 19);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(g.x - 4, g.y - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(g.x + 4, g.y - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
    if (g.state !== 'calm') {
      const mark = g.state === GUARD_ALERTED ? '!' : '?';
      const markColor = g.state === GUARD_ALERTED ? '#ff3b2d' : '#ffb02e';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(mark, g.x, g.y - 26);
      ctx.fillStyle = markColor;
      ctx.fillText(mark, g.x, g.y - 26);
    }
  }
  // The courier: dark hooded cloak, pale face, direction tick, quiet in shadow.
  // A faint light pool under them so the courier always reads against the floor.
  const p = game.player;
  const pool = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
  pool.addColorStop(0, 'rgba(150, 170, 230, 0.16)');
  pool.addColorStop(1, 'rgba(150, 170, 230, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(p.x - 34, p.y - 34, 68, 68);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 9, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.inShadow ? '#35406a' : '#4a5b8f';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 13);
  ctx.quadraticCurveTo(p.x + 12, p.y - 2, p.x + 9, p.y + 10);
  ctx.lineTo(p.x - 9, p.y + 10);
  ctx.quadraticCurveTo(p.x - 12, p.y - 2, p.x, p.y - 13);
  ctx.fill();
  ctx.strokeStyle = '#aebfe8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#e8d9b0';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.facing) * 8, p.y + Math.sin(p.facing) * 8);
  ctx.lineTo(p.x + Math.cos(p.facing) * 15, p.y + Math.sin(p.facing) * 15);
  ctx.stroke();
  if (game.hasParcel) {
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(p.x - 14, p.y - 2, 7, 9);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(p.x - 14, p.y - 2, 7, 3);
  }
  // Detection halo: the courier glows when a guard's eye is on them.
  if (game.detection > 4) {
    ctx.strokeStyle = game.detection > 66 ? 'rgba(255, 60, 40, 0.9)' : 'rgba(255, 210, 62, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 19 + Math.sin(game.time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Last-seen marker: where the guards think the courier was.
  if (game.lastSeen && game.detection > 30) {
    ctx.strokeStyle = 'rgba(255, 90, 60, 0.7)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(game.lastSeen.x, game.lastSeen.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** A dark overlay panel with a title, lines of text and a prompt. */
function drawPanel(ctx, w, h, title, titleColor, lines, prompt) {
  ctx.fillStyle = 'rgba(5, 7, 14, 0.78)';
  ctx.fillRect(0, 0, w, h);
  const pw = 560;
  const ph = 150 + lines.length * 26;
  const px = (w - pw) / 2;
  const py = (h - ph) / 2;
  ctx.fillStyle = '#10141f';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, px, py, pw, ph, 12);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(title, w / 2, py + 52);
  ctx.fillStyle = '#d8d4c8';
  ctx.font = '15px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, py + 92 + i * 26);
  });
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(prompt, w / 2, py + ph - 22);
}

function drawTitle(ctx, w, h, game) {
  drawPanel(ctx, w, h, 'NIGHT COURIER', '#ffd23e', [
    'A top-down stealth game. Slip through the guarded night,',
    'grab the parcel ✦, and reach the green EXIT unseen.',
    '',
    'Yellow cones are guard vision — shadow pools and bushes hide you.',
    'Running is fast but loud. Sneaking is slow but quiet.',
    '3 levels · intel pages +150 · parcel +250 · be quick for a bonus',
  ], 'PRESS ENTER OR CLICK TO START');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,228,216,0.6)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD / arrows move · Shift run · C sneak · click to walk · R retry', w / 2, h - 26);
  ctx.restore();
}

function drawLevelDone(ctx, w, h, game) {
  drawPanel(ctx, w, h, 'LEVEL COMPLETE', '#2ecc71', [
    `${game.levelDef.name} — unseen, parcel in hand.`,
    `Time ${formatLevelTime(game.elapsed)}  ·  Intel ${game.intelGot}/${game.intelTotal}  ·  Time bonus +${game.levelBonus}`,
    `Score ${game.score}`,
  ], 'PRESS ENTER FOR THE NEXT LEVEL');
}

function drawWin(ctx, w, h, game) {
  drawPanel(ctx, w, h, 'ALL THREE PARCELS DELIVERED', '#ffd23e', [
    'The courier melts back into the night. Nobody saw a thing.',
    `Final score ${game.score}  ·  Intel ${game.intelGot}/${game.intelTotal} on the last level`,
    'Thanks for playing Night Courier.',
  ], 'PRESS ENTER TO PLAY AGAIN');
}

function drawCaught(ctx, w, h, game) {
  drawPanel(ctx, w, h, 'CAUGHT!', '#ff4538', [
    'A guard got their hands on the courier.',
    'Watch the patrols, wait in the shadows, and never run past a cone.',
    `Score ${game.score}  ·  ${game.levelDef.name}`,
  ], 'PRESS R TO RETRY THIS LEVEL');
}

function formatLevelTime(seconds) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Draw the whole game into `ctx` at canvas size (w, h). The level scales to
 * fit with letterboxing; the HUD sits on top.
 */
export function drawGame(ctx, w, h, game) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(w / LEVEL_W, (h - 46) / LEVEL_H);
  const ox = (w - LEVEL_W * scale) / 2;
  const oy = 46 + ((h - 46 - LEVEL_H * scale) / 2);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  drawLevel(ctx, game);
  drawObjectives(ctx, game);
  drawActors(ctx, game);
  ctx.restore();
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 40, 25, ${game.flashTimer * 0.5})`;
    ctx.fillRect(0, 0, w, h);
  }
  return { scale, ox, oy };
}

export function drawScreen(ctx, w, h, game) {
  if (game.screen === SCREEN_TITLE) drawTitle(ctx, w, h, game);
  if (game.screen === SCREEN_LEVEL_DONE) drawLevelDone(ctx, w, h, game);
  if (game.screen === SCREEN_WIN) drawWin(ctx, w, h, game);
  if (game.screen === SCREEN_CAUGHT) drawCaught(ctx, w, h, game);
}

export { LEVEL_W, LEVEL_H };
