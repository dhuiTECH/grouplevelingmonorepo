/**
 * Reads Godot 4 TileSet .tres terrains_peering_bit data for atlas cells 0:0–11:3
 * and writes packages/map-autotile/src/godotTerrainMaskToAtlas.ts
 *
 * Run: node apps/web/scripts/generate-godot-terrain-map.mjs
 * Optional: node apps/web/scripts/generate-godot-terrain-map.mjs path/to/winlu.tres
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PEERING_WEIGHT = {
  top_side: 1,
  top_right_corner: 2,
  right_side: 4,
  bottom_right_corner: 8,
  bottom_side: 16,
  bottom_left_corner: 32,
  left_side: 64,
  top_left_corner: 128,
};

const DEFAULT_TRES = path.join(__dirname, 'winlu.tres');
const OUT_FILE = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'map-autotile',
  'src',
  'godotTerrainMaskToAtlas.ts'
);

function parseTres(text) {
  const lines = text.split(/\r?\n/);

  /** @type {Set<string>} */
  const terrainCells = new Set();
  /** @type {Map<string, number>} key "x,y" -> mask */
  const masks = new Map();

  const terrainSetRe = /^(\d+):(\d+)\/0\/terrain_set\s*=/;
  const peeringRe = /^(\d+):(\d+)\/0\/terrains_peering_bit\/([^ =]+)\s*=/;

  for (const line of lines) {
    let m = line.match(terrainSetRe);
    if (m) {
      const x = parseInt(m[1], 10);
      const y = parseInt(m[2], 10);
      if (x >= 0 && x <= 11 && y >= 0 && y <= 3) {
        terrainCells.add(`${x},${y}`);
      }
      continue;
    }
    m = line.match(peeringRe);
    if (m) {
      const x = parseInt(m[1], 10);
      const y = parseInt(m[2], 10);
      const bitName = m[3];
      if (x < 0 || x > 11 || y < 0 || y > 3) continue;
      if (bitName === 'center') continue;
      const w = PEERING_WEIGHT[bitName];
      if (w === undefined) {
        console.warn(`Unknown peering bit "${bitName}" — skipped`);
        continue;
      }
      const key = `${x},${y}`;
      masks.set(key, (masks.get(key) ?? 0) | w);
    }
  }

  /** @type {Map<number, [number, number]>} */
  const maskToCell = new Map();

  for (const key of terrainCells) {
    const [xs, ys] = key.split(',');
    const x = parseInt(xs, 10);
    const y = parseInt(ys, 10);
    const mask = masks.get(key) ?? 0;
    if (maskToCell.has(mask)) {
      const prev = maskToCell.get(mask);
      throw new Error(
        `Duplicate mask ${mask} for atlas cells (${prev[0]},${prev[1]}) and (${x},${y}). Fix Godot terrain or parser.`
      );
    }
    maskToCell.set(mask, [x, y]);
  }

  return maskToCell;
}

function emitTs(maskToCell) {
  const entries = [...maskToCell.entries()].sort((a, b) => a[0] - b[0]);
  const body = entries
    .map(([mask, [col, row]]) => `  ${mask}: [${col}, ${row}],`)
    .join('\n');

  return `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: apps/web/scripts/winlu.tres
 * Regenerate: pnpm --filter web run generate:godot-terrain (writes this package)
 */

export const GODOT_MASK_TO_ATLAS_CELL: Record<number, [number, number]> = {
${body}
};
`;
}

function main() {
  const tresPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_TRES;
  const text = fs.readFileSync(tresPath, 'utf8');
  const maskToCell = parseTres(text);
  const out = emitTs(maskToCell);
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, out, 'utf8');
  console.log(`Wrote ${OUT_FILE} (${maskToCell.size} mask entries)`);
}

main();
