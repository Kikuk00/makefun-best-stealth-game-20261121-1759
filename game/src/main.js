// Night Courier bootstrap: canvas sizing, the fixed-step game loop, screen
// transitions from keys and clicks, and the ?shot= staging for screenshots.
import { Game, SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_DONE, SCREEN_WIN, SCREEN_CAUGHT } from './game.js';
import { drawGame, drawScreen } from './render.js';
import { drawHud, drawHints } from './hud.js';
import { Input } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
input.attach();

const game = new Game();
const statusEl = document.getElementById('status');

/** Resize the canvas to the window; the renderer letterboxes the level. */
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Screenshot staging: ?shot=cover|nearmiss|alert|win plays the real rules
// forward and freezes on the frame, with no HUD animation after it.
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  stageShot(shotName, game);
  game.time = 0;
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

/** Advance screens from Enter/Space/R and clicks, as the current screen allows. */
function handleScreens() {
  const advance = input.wasPressed('enter') || input.wasPressed(' ');
  const retry = input.wasPressed('r');
  const clicked = input.clickTarget !== null;
  if (game.screen === SCREEN_TITLE && (advance || clicked)) {
    game.sound.ensure();
    game.startGame();
    announce('Night Courier started. Find the parcel, reach the exit unseen.');
  } else if (game.screen === SCREEN_LEVEL_DONE && advance) {
    game.nextLevel();
    announce(`Level ${game.levelIndex + 1}: ${game.levelDef.name}.`);
  } else if (game.screen === SCREEN_WIN && advance) {
    game.startGame();
  } else if (game.screen === SCREEN_CAUGHT && retry) {
    game.retryLevel();
    announce(`Retrying ${game.levelDef.name}.`);
  }
  if (clicked && game.screen === SCREEN_PLAY) {
    game.sound.ensure();
  }
}

const STEP = 1 / 60;
let last = performance.now();
let accumulator = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  handleScreens();
  if (!shotName) {
    accumulator += dt;
    while (accumulator >= STEP) {
      const events = game.step(STEP, { keys: input.keys, clickTarget: input.clickTarget });
      game.playEvents(events);
      accumulator -= STEP;
    }
  }
  const view = drawGame(ctx, canvas.width, canvas.height, game);
  if (game.screen === SCREEN_PLAY) {
    drawHud(ctx, canvas.width, game);
    drawHints(ctx, canvas.width, canvas.height, game);
  }
  drawScreen(ctx, canvas.width, canvas.height, game);
  // Translate a click from screen pixels into level pixels for click-to-move.
  if (input.clickTarget && input.clickTarget.raw) {
    const c = input.clickTarget;
    input.clickTarget = {
      x: (c.x - view.ox) / view.scale,
      y: (c.y - view.oy) / view.scale,
    };
    game.player.clickTarget = input.clickTarget;
  }
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
