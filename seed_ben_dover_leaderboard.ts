/**
 * Upserts a demo recorded_run so "Ben Dover" appears #1 on the **Central Burnaby Gate** leaderboard
 * (not the separate "Central Park — Burnaby" gate — two different global_dungeons rows).
 *
 * Dungeon match: name ILIKE '%central%burnaby%gate%' (does not match "Central Park — Burnaby").
 * Optional: SEED_DUNGEON_ID=<uuid> to force a specific global_dungeons.id
 *
 * Requires: SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 * Optional: SEED_BEN_DOVER_USER_ID=<uuid> — skip name lookup and use this profile id
 *
 * Usage: pnpm seed:ben-dover-leaderboard
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SEED_RUN_ID = 'a0000000-0000-4000-8000-000000000b01';

function loadEnv(): void {
  const root = process.cwd();
  const candidates = [path.join(root, 'apps', 'mobile', '.env'), path.join(root, '.env')];
  for (const p of candidates) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: true });
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main(): Promise<void> {
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const explicitUserId = process.env.SEED_BEN_DOVER_USER_ID?.trim();
  let userId: string | null = explicitUserId ?? null;

  if (!userId) {
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, hunter_name')
      .ilike('hunter_name', '%ben%dover%')
      .limit(5);

    if (pErr) {
      console.error('profiles lookup failed:', pErr.message);
      process.exit(1);
    }
    if (!profiles?.length) {
      console.error(
        'No profile with hunter_name matching "Ben Dover". Set your display name in the app, or run:\n' +
          '  SEED_BEN_DOVER_USER_ID=<your-auth-user-uuid> pnpm seed:ben-dover-leaderboard'
      );
      process.exit(1);
    }
    if (profiles.length > 1) {
      console.warn('Multiple matches; using first:', profiles.map((p) => `${p.hunter_name} (${p.id})`).join(', '));
    }
    userId = profiles[0]!.id;
  }

  const explicitDungeonId = process.env.SEED_DUNGEON_ID?.trim();
  let dungeon: { id: string; name: string } | null = null;

  if (explicitDungeonId) {
    const { data: d, error: dErr } = await supabase
      .from('global_dungeons')
      .select('id, name')
      .eq('id', explicitDungeonId)
      .maybeSingle();
    if (dErr) {
      console.error('global_dungeons lookup failed:', dErr.message);
      process.exit(1);
    }
    dungeon = d ?? null;
  } else {
    const { data: dungeons, error: dErr } = await supabase
      .from('global_dungeons')
      .select('id, name')
      .ilike('name', '%central%burnaby%gate%')
      .order('name', { ascending: true })
      .limit(1);

    if (dErr) {
      console.error('global_dungeons lookup failed:', dErr.message);
      process.exit(1);
    }
    dungeon = dungeons?.[0] ?? null;
  }

  if (!dungeon?.id) {
    console.error(
      'No global_dungeons row named like "Central Burnaby Gate". Add that gate or set SEED_DUNGEON_ID.'
    );
    process.exit(1);
  }

  const { error: upsertErr } = await supabase.from('recorded_runs').upsert(
    {
      id: SEED_RUN_ID,
      user_id: userId,
      dungeon_id: dungeon.id,
      encoded_polyline: '_zmkH~wxmVgEgE',
      total_time_seconds: 3600,
      distance_meters: 10909,
    },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    console.error('recorded_runs upsert failed:', upsertErr.message);
    process.exit(1);
  }

  console.log(
    `OK — leaderboard seed for "${dungeon.name}" (${dungeon.id})\n` +
      `  user_id=${userId}\n` +
      `  time=1h, pace≈5:30/km (distance_m=10909)\n` +
      `  Re-open the gate modal or leaderboard to refresh.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
