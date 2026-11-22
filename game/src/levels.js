// Level definitions for Night Courier: three hand-built night maps.
// Legend: '#' wall, 'C' crate (blocks movement and sight), 'B' bush (blocks
// sight, hides the courier, slows movement), 's' shadow pool (safe dark floor),
// '.' open floor, 'P' courier start, 'X' the parcel, 'E' the exit, 'i' intel page.
// Every map is 24 tiles wide and 15 tall; TILE is 40 px, so a level is 960 x 600.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;

/** A guard patrol: waypoints in tile coordinates, walked in order and back. */
function patrol(waypoints, pause = 1.2) {
  return { waypoints, pause };
}

export const LEVELS = [
  {
    name: 'Night Shift',
    sub: 'Warehouse 7 — grab the parcel, reach the green door unseen',
    map: [
      '########################',
      '#P....ss......i........#',
      '#..CC....BB......CC....#',
      '#..CC....BB...C......#.#',
      '#..................#...#',
      '#..###.....ss......#...#',
      '#..###.............#...#',
      '#......C......C........#',
      '#......C......C....##..#',
      '#..ss......i.......##..#',
      '#......................#',
      '#.CC....BB......CC.....#',
      '#.CC....BB...C.....i...#',
      '#....X......ss.......E.#',
      '########################',
    ],
    guards: [
      patrol([[3, 4], [18, 4]]),
      patrol([[12, 2], [12, 12]]),
      patrol([[18, 10], [5, 10]]),
    ],
    guardSpeed: 52,
    coneRange: 175,
  },
  {
    name: 'Museum After Dark',
    sub: 'The Hartley Gallery — tighter patrols, more eyes on the floor',
    map: [
      '########################',
      '#P..ss....C.......i....#',
      '#..###....C...BB.......#',
      '#..###........BB...#...#',
      '#......C..........#....#',
      '#.####....ss....###....#',
      '#......C......C........#',
      '#..i...C..C...C....i...#',
      '#......C......C....##..#',
      '#..ss.....BB......##...#',
      '#........BB....C.......#',
      '#.CC......C....###.....#',
      '#.CC..i.......###..C...#',
      '#...X....ss.......C..E.#',
      '########################',
    ],
    guards: [
      patrol([[12, 1], [21, 1]], 0.8),
      patrol([[13, 3], [13, 12]], 0.8),
      patrol([[9, 4], [16, 4]], 1.0),
      patrol([[6, 2], [6, 12]], 0.8),
    ],
    guardSpeed: 60,
    coneRange: 185,
  },
  {
    name: 'The Vault Row',
    sub: 'Meridian Vaults — five guards, no room for a loud mistake',
    map: [
      '########################',
      '#P...C....ss....C...i..#',
      '#..##....C......##.....#',
      '#..##...........##..#..#',
      '#.....C....BB......#...#',
      '#.###....BB....C..###..#',
      '#.....C......C.........#',
      '#..i....C..C....ss..i..#',
      '#.....C......C....##...#',
      '#..ss.....BB......##...#',
      '#........BB...C........#',
      '#.CC.....C....###..C...#',
      '#.CC..i......###...C...#',
      '#...X....ss......C...E.#',
      '########################',
    ],
    guards: [
      patrol([[6, 3], [14, 3]], 0.6),
      patrol([[7, 2], [7, 12]], 0.6),
      patrol([[13, 7], [21, 7]], 0.7),
      patrol([[12, 6], [12, 12]], 0.8),
      patrol([[21, 2], [21, 12]], 0.6),
    ],
    guardSpeed: 68,
    coneRange: 195,
  },
];

/** Tile at column/row of a parsed level, '#' outside the map. */
export function tileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return level.map[row][col];
}

/** True when the tile blocks movement (walls and crates; bushes do not). */
export function blocksMovement(ch) {
  return ch === '#' || ch === 'C';
}

/** True when the tile blocks a guard's line of sight (walls, crates, bushes). */
export function blocksSight(ch) {
  return ch === '#' || ch === 'C' || ch === 'B';
}

/** Centre of a tile in pixels. */
export function tileCentre(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

/** Find every tile holding `ch` in a level map, as {col, row} list. */
export function findTiles(level, ch) {
  const found = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (level.map[row][col] === ch) found.push({ col, row });
    }
  }
  return found;
}

/** Flood fill from the courier start over walkable tiles; returns a Set of "col,row". */
export function reachableTiles(level) {
  const start = findTiles(level, 'P')[0];
  const seen = new Set();
  const queue = [start];
  seen.add(`${start.col},${start.row}`);
  while (queue.length > 0) {
    const { col, row } = queue.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      const key = `${nc},${nr}`;
      if (seen.has(key)) continue;
      if (blocksMovement(tileAt(level, nc, nr))) continue;
      seen.add(key);
      queue.push({ col: nc, row: nr });
    }
  }
  return seen;
}
