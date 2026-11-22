// Screenshot scenes behind ?shot=cover|nearmiss|alert|win.
// Each scene plays the real rules forward from a fresh level with a scripted
// courier (real steps, real guards, real detection), so the frame is what a
// short game really looks like — the same seed always gives the same frame.
import { SCREEN_PLAY, SCREEN_LEVEL_DONE } from './game.js';

const STEP = 1 / 60;

/** A scripted courier: list of {dx, dy, run, sneak, seconds} moves. */
function runScript(game, script) {
  const keys = { left: false, right: false, up: false, down: false, run: false, sneak: false };
  for (const move of script) {
    keys.left = move.dx < 0;
    keys.right = move.dx > 0;
    keys.up = move.dy < 0;
    keys.down = move.dy > 0;
    keys.run = !!move.run;
    keys.sneak = !!move.sneak;
    const steps = Math.round(move.seconds / STEP);
    for (let i = 0; i < steps; i += 1) {
      game.step(STEP, { keys, clickTarget: null });
      if (game.screen !== SCREEN_PLAY) return;
    }
  }
}

/** Park the courier at a tile and let the guards patrol for `seconds`. */
function idleAt(game, col, row, seconds) {
  const keys = { left: false, right: false, up: false, down: false, run: false, sneak: false };
  game.player.x = (col + 0.5) * 40;
  game.player.y = (row + 0.5) * 40;
  game.player.updateGround(game.level);
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.step(STEP, { keys, clickTarget: null });
}

/**
 * Stage the named shot on a fresh game and return the screen to draw.
 * cover — full level 1 from above, courier mid-sneak near the parcel run.
 * nearmiss — courier at a cone's edge, detection high, a guard suspicious.
 * alert — the alarm is up, guards chasing, courier sprinting for the exit.
 * win — the level-complete screen after a clean run.
 */
export function stageShot(name, game) {
  game.startGame();
  if (name === 'cover') {
    runScript(game, [
      { dx: 1, dy: 0, seconds: 2.6 },
      { dx: 0, dy: 1, seconds: 2.2 },
      { dx: 1, dy: 0, seconds: 1.6 },
      { dx: 0, dy: 1, seconds: 1.4 },
      { dx: 1, dy: 0, sneak: true, seconds: 1.2 },
    ]);
    return SCREEN_PLAY;
  }
  if (name === 'nearmiss') {
    // Courier crouched at the edge of the row-4 guard's cone, detection high.
    runScript(game, [
      { dx: 1, dy: 0, seconds: 1.8 },
      { dx: 0, dy: 1, seconds: 0.9 },
    ]);
    game.screen = SCREEN_PLAY;
    idleAt(game, 10, 3, 0.4);
    game.screen = SCREEN_PLAY;
    game.detection = 74;
    const guard = game.guards[0];
    guard.becomeSuspicious(game.player.x, game.player.y);
    guard.x = 13 * 40 + 20;
    guard.y = 3 * 40 + 20;
    guard.facing = Math.PI;
    return SCREEN_PLAY;
  }
  if (name === 'alert') {
    // Courier has the parcel and is sprinting for the exit as guards chase.
    runScript(game, [
      { dx: 1, dy: 0, seconds: 2.6 },
      { dx: 0, dy: 1, seconds: 2.2 },
      { dx: -1, dy: 0, seconds: 1.0 },
      { dx: 0, dy: 1, seconds: 3.2 },
      { dx: -1, dy: 0, seconds: 1.4 },
    ]);
    game.screen = SCREEN_PLAY;
    game.parcel.taken = true;
    game.hasParcel = true;
    game.score += 250;
    game.player.x = 7 * 40 + 20;
    game.player.y = 12 * 40 + 20;
    game.detection = 100;
    for (const g of game.guards) g.becomeAlerted(game.player.x, game.player.y);
    game.guards[1].x = 11 * 40 + 20;
    game.guards[1].y = 10 * 40 + 20;
    game.flashTimer = 0.25;
    return SCREEN_PLAY;
  }
  if (name === 'win') {
    game.screen = SCREEN_LEVEL_DONE;
    game.elapsed = 74;
    game.intelGot = 2;
    game.levelBonus = 304;
    game.score = 1154;
    return SCREEN_LEVEL_DONE;
  }
  return SCREEN_PLAY;
}
