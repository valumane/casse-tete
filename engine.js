export const COLS = 6;
export const ROWS = 8;
export const SHAPES = [
  { name: 'le bloc rouge', w: 2, h: 2, type: 'trash', label: 'Rouge' },
  { name: 'le bloc jaune A', w: 2, h: 2, type: 'yellow', label: 'A' },
  { name: 'le bloc jaune B', w: 2, h: 2, type: 'yellow', label: 'B' },
  { name: 'le bloc bleu C', w: 2, h: 1, type: 'blue', label: 'C' },
  { name: 'le bloc bleu D', w: 2, h: 1, type: 'blue', label: 'D' },
  { name: 'le bloc bleu E', w: 2, h: 1, type: 'blue', label: 'E' },
  { name: 'le bloc bleu F', w: 2, h: 1, type: 'blue', label: 'F' },
];
export const INITIAL = [0, 12, 14, 24, 26, 30, 32];
export const TARGET = 38;
export const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];
export function isFloor(x, y) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  if (y < 2) return x < 2;
  if (y === 2) return true;
  if (y < 6) return x < 4;
  return x >= 2 && x < 4;
}
export const FLOOR = Array.from({length: 48}, (_, p) => isFloor(p % 6, Math.floor(p / 6)));
function occupancy(state) {
  const grid = new Uint8Array(48);
  state.forEach((p, i) => {
    const {w, h} = SHAPES[i];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) grid[p + dy * 6 + dx] = i + 1;
  });
  return grid;
}
function canPlace(grid, id, x, y) {
  const {w, h} = SHAPES[id];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    if (!isFloor(x + dx, y + dy)) return false;
    const taken = grid[(y + dy) * 6 + x + dx];
    if (taken && taken !== id + 1) return false;
  }
  return true;
}
export function maxTravel(state, id, dx, dy) {
  const grid = occupancy(state);
  const x = state[id] % 6, y = Math.floor(state[id] / 6);
  let distance = 0;
  while (canPlace(grid, id, x + dx * (distance + 1), y + dy * (distance + 1))) distance++;
  return distance;
}
export function movePiece(state, id, dx, dy, distance = 1) {
  if (!Number.isInteger(id) || id < 0 || id >= SHAPES.length || Math.abs(dx) + Math.abs(dy) !== 1 || !Number.isInteger(distance) || distance < 1) return null;
  if (maxTravel(state, id, dx, dy) < distance) return null;
  const next = state.slice();
  next[id] += (dx + dy * 6) * distance;
  return next;
}
export function isValid(state) {
  if (!Array.isArray(state) || state.length !== 7) return false;
  const occupied = new Set();
  return state.every((p, i) => {
    if (!Number.isInteger(p) || p < 0 || p >= 48) return false;
    const x = p % 6, y = Math.floor(p / 6);
    for (let dy = 0; dy < SHAPES[i].h; dy++) for (let dx = 0; dx < SHAPES[i].w; dx++) {
      const cell = (y + dy) * 6 + x + dx;
      if (!isFloor(x + dx, y + dy) || occupied.has(cell)) return false;
      occupied.add(cell);
    }
    return true;
  });
}
const key = s => [s[0], ...s.slice(1, 3).sort((a,b) => a-b), ...s.slice(3).sort((a,b) => a-b)].join(',');
export function solve(initial, limit = 150000) {
  if (!isValid(initial)) return null;
  const nodes = [{state: initial.slice(), parent: -1, move: null}];
  const seen = new Set([key(initial)]);
  for (let head = 0; head < nodes.length && nodes.length < limit; head++) {
    const node = nodes[head], state = node.state;
    if (state[0] === TARGET) {
      const path = [];
      for (let n = head; nodes[n].parent >= 0; n = nodes[n].parent) path.push(nodes[n].move);
      return path.reverse();
    }
    const grid = occupancy(state);
    for (let id = 0; id < 7; id++) {
      const x = state[id] % 6, y = Math.floor(state[id] / 6);
      for (const {dx, dy} of DIRECTIONS) {
        for (let distance = 1; canPlace(grid, id, x + dx * distance, y + dy * distance); distance++) {
          const next = state.slice();
          next[id] += (dx + dy * 6) * distance;
          const k = key(next);
          if (seen.has(k)) continue;
          seen.add(k);
          nodes.push({state: next, parent: head, move: {id, dx, dy, distance}});
        }
      }
    }
  }
  return null;
}
