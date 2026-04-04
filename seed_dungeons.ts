/**
 * Seeds global_dungeons from ORS round-trips (curated hotspots only).
 *
 * If grid rows keep reappearing: stop any old `pnpm seed-dungeons` (Ctrl+C in that terminal).
 * On Windows, `pnpm kill` stops all Node processes (including a stuck seeder). The DB also
 * rejects new "Metro Vancouver Grid …" names via trigger after migration 20260409120000.
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildHotspotList, type Hotspot } from './seed-dungeon-hotspots';

function loadEnv(): void {
  const root = process.cwd();
  const candidates = [path.join(root, 'apps', 'mobile', '.env'), path.join(root, '.env')];
  for (const p of candidates) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: true });
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORS_API_KEY = process.env.ORS_API_KEY;

const missingEnv: string[] = [];
if (!supabaseUrl) missingEnv.push('SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
if (!supabaseKey) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY');
if (!ORS_API_KEY) missingEnv.push('ORS_API_KEY');
if (missingEnv.length > 0) {
  console.error(`Missing env: ${missingEnv.join(', ')} (use .env at repo root or apps/mobile/.env)`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseKey!);
const orsApiKey = ORS_API_KEY!;

/** ORS Standard plan: Directions ~2,000/day — stay under this unless you know your quota */
const MAX_REQUESTS = Math.min(
  2000,
  Math.max(1, parseInt(process.env.ORS_MAX_REQUESTS ?? '2000', 10) || 2000)
);
/** Space requests to avoid per-minute throttling (ms between successful ORS calls) */
const DELAY_MS = Math.max(0, parseInt(process.env.ORS_DELAY_MS ?? '1500', 10) || 1500);
/** Max vertices sent to elevation/line (ORS has practical limits) */
const ELEVATION_MAX_POINTS = 180;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Difficulty score from route length + climb (tunable).
 * ~5 km flat ≈ 50; 5 km + 150 m gain ≈ 68; 10 km + 400 m ≈ 148 → S.
 */
function tierAndXpFromStats(distanceMeters: number, elevationGainMeters: number): { tier: string; xp: number } {
  const km = distanceMeters / 1000;
  const score = km * 10 + elevationGainMeters * 0.12;

  if (score >= 95) return { tier: 'S', xp: 3000 };
  if (score >= 72) return { tier: 'A', xp: 1800 };
  if (score >= 48) return { tier: 'B', xp: 1000 };
  return { tier: 'C', xp: 500 };
}

function downsampleLineCoords(coords: number[][], maxPoints: number): number[][] {
  if (coords.length <= maxPoints) return coords;
  const out: number[][] = [];
  const n = coords.length;
  const step = (n - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    out.push(coords[Math.min(n - 1, Math.round(i * step))]!);
  }
  return out;
}

function sumPositiveElevationGain(elevationsM: number[]): number {
  let gain = 0;
  for (let i = 1; i < elevationsM.length; i++) {
    const d = elevationsM[i]! - elevationsM[i - 1]!;
    if (d > 0) gain += d;
  }
  return Math.round(gain);
}

function extractElevationsFromOrsGeometry(data: unknown): number[] {
  const coords = extractLineStringCoords(data);
  const out: number[] = [];
  for (const c of coords) {
    if (c.length >= 3 && typeof c[2] === 'number' && Number.isFinite(c[2])) out.push(c[2]);
  }
  return out;
}

function extractLineStringCoords(data: unknown): number[][] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  if (d.type === 'FeatureCollection' && Array.isArray(d.features)) {
    const f0 = d.features[0] as Record<string, unknown> | undefined;
    const g = f0?.geometry as Record<string, unknown> | undefined;
    if (g?.type === 'LineString' && Array.isArray(g.coordinates)) return g.coordinates as number[][];
  }
  if (d.type === 'Feature') {
    const g = d.geometry as Record<string, unknown> | undefined;
    if (g?.type === 'LineString' && Array.isArray(g.coordinates)) return g.coordinates as number[][];
  }
  if (d.type === 'LineString' && Array.isArray(d.coordinates)) return d.coordinates as number[][];
  return [];
}

async function fetchElevationGainMeters(
  lineString2d: { type: string; coordinates: number[][] }
): Promise<number> {
  let coords = lineString2d.coordinates;
  if (coords.length < 2) return 0;
  coords = downsampleLineCoords(coords, ELEVATION_MAX_POINTS);

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await axios.post(
        'https://api.openrouteservice.org/elevation/line',
        {
          format_in: 'geojson',
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
          format_out: 'geojson',
          dataset: 'srtm',
        },
        {
          headers: {
            Authorization: orsApiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      const elevs = extractElevationsFromOrsGeometry(response.data);
      if (elevs.length < 2) return 0;
      return sumPositiveElevationGain(elevs);
    } catch (err: unknown) {
      lastErr = err;
      const ax = axios.isAxiosError(err);
      const status = ax ? err.response?.status : 0;
      if (status === 429 || status === 503) {
        const backoff = 4000 * (attempt + 1);
        console.warn(`⏳ Elevation rate limited (${status}), retry in ${backoff}ms…`);
        await sleep(backoff);
        continue;
      }
      console.warn(
        '⚠️ Elevation request failed, using 0 m gain:',
        ax ? JSON.stringify(err.response?.data ?? err.message) : err
      );
      return 0;
    }
  }
  console.warn('⚠️ Elevation failed after retries:', lastErr);
  return 0;
}

async function fetchRoundTrip(spot: Hotspot): Promise<{
  geometry: { type: string; coordinates: number[][] };
  distanceMeters: number;
}> {
  const lengthMeters = spot.lengthMeters ?? 5000;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await axios.post(
        'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
        {
          coordinates: [[spot.lng, spot.lat]],
          options: {
            round_trip: {
              length: lengthMeters,
              points: 3,
              seed: Math.floor(Math.random() * 100),
            },
          },
        },
        {
          headers: {
            Authorization: orsApiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      const geometry = response.data.features[0].geometry;
      const summary = response.data.features[0].properties?.summary;
      const dist =
        summary && typeof summary.distance === 'number' && Number.isFinite(summary.distance)
          ? Math.round(summary.distance)
          : lengthMeters;
      return { geometry, distanceMeters: dist };
    } catch (err: unknown) {
      lastErr = err;
      const ax = axios.isAxiosError(err);
      const status = ax ? err.response?.status : 0;
      if (status === 429 || status === 503) {
        const backoff = 5000 * (attempt + 1);
        console.warn(`⏳ Rate limited / busy (${status}), retry in ${backoff}ms…`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function purgeMetroVancouverGridAtStart(): Promise<void> {
  const { data, error } = await supabase.rpc('purge_metro_vancouver_grid_gates');
  if (error) {
    console.warn(
      '⚠️  Could not purge Metro Vancouver grid rows (run migration 20260409120000):',
      error.message
    );
    return;
  }
  const n = typeof data === 'number' ? data : Number(data) || 0;
  if (n > 0) console.log(`🧹 Removed ${n} Metro Vancouver grid gate(s) before seed.`);
}

async function seedGates() {
  await purgeMetroVancouverGridAtStart();

  const hotspots = buildHotspotList(MAX_REQUESTS);
  const estMin = ((hotspots.length * DELAY_MS) / 60000).toFixed(1);

  console.log('🌍 GroupLeveling World Seeder');
  console.log('   Tier = f(distance, elevation gain); XP scales with tier.');
  console.log('   Synthetic Metro Vancouver grid gates are disabled (curated list + DB trigger).');
  console.log(`   ORS directions cap: ${MAX_REQUESTS} (set ORS_MAX_REQUESTS to lower)`);
  console.log(`   Hotspots to process: ${hotspots.length}`);
  console.log(`   Delay: ${DELAY_MS}ms → ~${estMin} min wall time (set ORS_DELAY_MS)`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < hotspots.length; i++) {
    const spot = hotspots[i];
    if (spot.name.startsWith('Metro Vancouver Grid')) {
      console.warn(`\n⏭️  Skipped forbidden grid name: ${spot.name}`);
      continue;
    }
    process.stdout.write(`\r[${i + 1}/${hotspots.length}] ${spot.name.slice(0, 50)}…`);

    try {
      const { geometry, distanceMeters } = await fetchRoundTrip(spot);
      await sleep(300);
      const elevationGainMeters = await fetchElevationGainMeters(geometry);
      const { tier, xp } = tierAndXpFromStats(distanceMeters, elevationGainMeters);

      const { error } = await supabase.from('global_dungeons').upsert(
        {
          name: spot.name,
          distance_meters: distanceMeters,
          elevation_gain_meters: elevationGainMeters,
          path_line: geometry,
          tier: tier,
          xp_reward: xp,
        },
        { onConflict: 'name' }
      );

      if (error) {
        console.error(`\n❌ Supabase ${spot.name}:`, error.message);
        fail += 1;
      } else {
        ok += 1;
      }
    } catch (err: unknown) {
      const ax = axios.isAxiosError(err);
      const msg = ax
        ? JSON.stringify(err.response?.data ?? err.message)
        : err instanceof Error
          ? err.message
          : String(err);
      console.error(`\n❌ ORS ${spot.name}:`, msg);
      fail += 1;
    }

    if (i < hotspots.length - 1 && DELAY_MS > 0) await sleep(DELAY_MS);
  }

  console.log(`\n\n🚀 Done. OK: ${ok}, failed: ${fail}`);
}

seedGates().catch((e) => {
  console.error(e);
  process.exit(1);
});
