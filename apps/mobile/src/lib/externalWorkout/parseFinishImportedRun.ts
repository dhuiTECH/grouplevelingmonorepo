import type { FinishImportedRunResult } from './types';

/** Parses jsonb from `finish_imported_run` RPC. */
export function parseFinishImportedRunPayload(raw: unknown): FinishImportedRunResult {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, reason: 'invalid_response' };
  }
  const o = raw as Record<string, unknown>;
  if (o.ok === false) {
    return { ok: false, reason: String(o.reason ?? 'unknown') };
  }
  if (o.ok !== true) {
    return { ok: false, reason: 'invalid_response' };
  }
  if (o.kind === 'gate') {
    return {
      ok: true,
      kind: 'gate',
      dungeon_id: String(o.dungeon_id ?? ''),
      distance_meters: Number(o.distance_meters ?? 0),
    };
  }
  if (o.kind === 'free') {
    return {
      ok: true,
      kind: 'free',
      free_hunt_id: String(o.free_hunt_id ?? ''),
      distance_meters: Number(o.distance_meters ?? 0),
      xp_earned: Number(o.xp_earned ?? 0),
    };
  }
  return { ok: false, reason: 'invalid_response' };
}
