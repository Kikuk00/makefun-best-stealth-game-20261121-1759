[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Kikuk00/makefun-best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Kikuk00/makefun-best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Night Courier

A complete, original top-down 2D stealth game that runs offline in a desktop browser from static files — no build step, no network request.

You are a courier on a night job. Slip through a guarded warehouse (then a museum, then a vault row), grab the glowing parcel ✦, and reach the green EXIT unseen.

## How to play

Serve `game/` with any static server and open `game/index.html`:

```sh
cd game && python3 -m http.server 8080
```

- **WASD / arrow keys** — move
- **Shift** — run: fast, but loud (noise rings draw nearby guards in)
- **C / Ctrl** — sneak: slow and quiet, much harder to spot
- **Click** — walk to a spot
- **R** — retry a level after being caught · **Enter** — advance screens

## The stealth

- **Guards patrol learnable routes** and pause at waypoints to look around.
- **Vision cones** are drawn on the floor and change colour with suspicion: yellow calm, orange suspicious, red alerted — and they hug walls and crates instead of shining through them.
- **Detection meter**: it fills while a guard sees you and drains while you stay hidden, so a near miss is a chance to recover, not a death sentence.
- **Alert states**: calm → suspicious (a guard walks over to check) → alerted (they chase, and the alarm banner flashes). Break line of sight and hide to cool down.
- **Cover**: crates block sight, bushes hide you completely, and dark shadow pools make you nearly invisible. Lit floor is dangerous; shadow is safe.
- **Sound**: guard footsteps ring out as expanding circles — a red ring means a chasing guard is close. Running leaves noise rings guards can hear.
- **3 levels** with more guards and tighter patrols, intel pages to collect (+150), parcel +250, and a time bonus for a quick clean run. Win screen per level, a final win screen, and a caught screen with retry.

All art is drawn by code (canvas shapes) and all sounds are synthesised with WebAudio — no borrowed images, no audio files, no network.

## Layout

- `game/index.html` — the page, canvas only
- `game/src/main.js` — bootstrap, fixed-step loop, screen transitions
- `game/src/game.js` — game state, detection, noise, scoring, win/lose
- `game/src/levels.js` — the three hand-built night maps
- `game/src/guards.js` — patrols and the calm → suspicious → alerted states
- `game/src/vision.js` — vision cones, line of sight, visibility
- `game/src/player.js` — the courier: walk, run, sneak, click-to-move
- `game/src/render.js` — canvas drawing: level, cones, actors, screens
- `game/src/hud.js` — top bar, detection meter, alert banner, hints
- `game/src/audio.js` — WebAudio synth: footsteps, alert sting, pickups
- `game/src/input.js` — keyboard and mouse input
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=cover|nearmiss|alert|win`)
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 4 screenshots of the real running game

Entered in [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759) on make.fun.

<sub>Entered on [make.fun](https://make.fun/?ref=wmk9f4s6&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
