import { supabase } from '../supabase';
import { CustomTile, MapState, Tile, ChunkSaveUiUpdate } from './types';

let chunkSaveReporter: ((update: ChunkSaveUiUpdate) => void) | null = null;

/** Wire the Zustand store (or tests) to receive save status from debounced chunk sync. */
export function setChunkSaveReporter(fn: typeof chunkSaveReporter) {
  chunkSaveReporter = fn;
}

/** Used by mapDataSlice.forceSyncAllChunks and internally by chunk sync. */
export function reportChunkSaveUi(update: ChunkSaveUiUpdate) {
  try {
    chunkSaveReporter?.(update);
  } catch (e) {
    console.error('[chunkSync] chunk save reporter error:', e);
  }
}

const CHUNK_SIZE = 16;
/** Shorter than before so saves start sooner after edits, while still batching bursts. */
const CHUNK_DEBOUNCE_MS = 650;
/** Parallel upserts — avoids long serial queues on multi-chunk edits. */
const CHUNK_UPSERT_CONCURRENCY = 5;
/**
 * Per-chunk HTTP timeout passed to AbortSignal.timeout() on the Supabase call.
 * This actually cancels the underlying fetch (unlike wrapping with Promise.race).
 */
export const MAP_CHUNK_UPSERT_TIMEOUT_MS = 30_000;

/**
 * Maximum time to wait for a previous flush to complete before starting the next one.
 * Prevents one stuck flush from blocking all subsequent saves.
 */
const GLOBAL_SYNC_WAIT_TIMEOUT_MS = 35_000;

/**
 * Rejects if `promise` does not settle within `ms`. Use for Supabase calls that can hang.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${Math.round(ms / 1000)}s — check your network connection and try again.`,
        ),
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

let globalSyncPromise: Promise<void> = Promise.resolve();
const pendingChunks = new Set<string>();
/** Avoid infinite re-queue loops when a chunk persistently fails (bad payload, DB, etc.). */
const chunkSyncFailCount = new Map<string, number>();
/** Retries after a failed flush — keep low to avoid long console spam. */
const MAX_CHUNK_SYNC_ATTEMPTS = 3;

/** Human-readable PostgREST error for the toolbar (and console). */
export function formatPostgrestError(err: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): string {
  const m = err.message || 'Request failed';
  const extras = [err.code && `code ${err.code}`, err.details, err.hint].filter(Boolean);
  return extras.length ? `${m} (${extras.join(' · ')})` : m;
}

function reportAfterFlushResult(result: {
  permanentFailures: string[];
  hadRequeue: boolean;
  lastErrorMessage?: string;
}) {
  if (result.permanentFailures.length > 0) {
    const detail = result.lastErrorMessage
      ? ` ${result.lastErrorMessage}`
      : '';
    reportChunkSaveUi({
      status: 'error',
      error: `Could not save ${result.permanentFailures.length} map region(s) after retries.${detail} Export from the sidebar to back up.`,
    });
    return;
  }
  if (result.hadRequeue) {
    reportChunkSaveUi({
      status: 'pending',
      pendingChunkCount: pendingChunks.size,
      lastSyncError: result.lastErrorMessage ?? null,
    });
    return;
  }
  reportChunkSaveUi({ status: 'saved', savedAt: Date.now() });
}

let batchTimeout: NodeJS.Timeout | null = null;

function normalizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  return url.split('?')[0];
}

export function buildLibByUrl(customTiles: CustomTile[]): Map<string, CustomTile> {
  const m = new Map<string, CustomTile>();
  for (const ct of customTiles) {
    m.set(normalizeUrl(ct.url), ct);
  }
  return m;
}

/**
 * Serializes one placed tile for map_chunks.tile_data, overlaying spritesheet fields
 * from the tile library so we do not need to mutate every placed tile in memory when
 * only library animation/size metadata changes.
 */
export function serializeTileForChunkPersistence(
  t: Tile,
  libByUrl: Map<string, CustomTile>,
): Record<string, unknown> {
  const { id, ...rest } = t;
  const row: Record<string, unknown> = {
    ...rest,
    block_col: t.blockCol || 0,
    block_row: t.blockRow || 0,
  };
  const lib = libByUrl.get(normalizeUrl(t.imageUrl));
  if (!lib) return row;
  if (lib.isSpritesheet !== undefined) row.isSpritesheet = lib.isSpritesheet;
  if (lib.frameCount !== undefined) row.frameCount = lib.frameCount;
  if (lib.frameWidth !== undefined) {
    row.frameWidth = lib.frameWidth;
    row.frame_width = lib.frameWidth;
  }
  if (lib.frameHeight !== undefined) {
    row.frameHeight = lib.frameHeight;
    row.frame_height = lib.frameHeight;
  }
  if (lib.animationSpeed !== undefined) row.animationSpeed = lib.animationSpeed;
  return row;
}

function groupTilesByChunk(allTiles: Tile[]): Map<string, Tile[]> {
  const m = new Map<string, Tile[]>();
  for (const t of allTiles) {
    if (typeof t.x !== 'number' || typeof t.y !== 'number' || isNaN(t.x) || isNaN(t.y)) {
      continue;
    }
    const key = `${Math.floor(t.x / CHUNK_SIZE)},${Math.floor(t.y / CHUNK_SIZE)}`;
    let arr = m.get(key);
    if (!arr) {
      arr = [];
      m.set(key, arr);
    }
    arr.push(t);
  }
  return m;
}

/**
 * Proactively refresh the Supabase session if it's near expiry.
 * PostgREST calls with an expired JWT can hang silently until timeout
 * (even with RLS disabled, the realtime/auth layer can misbehave).
 */
async function ensureFreshSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
    const needsRefresh = !expiresAtMs || expiresAtMs < Date.now() + 60_000;
    if (needsRefresh && session.refresh_token) {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[chunkSync] Session refresh failed:', error.message);
      }
    }
  } catch (e) {
    console.warn('[chunkSync] ensureFreshSession error:', e);
  }
}

async function upsertChunkFromIndex(
  chunkKey: string,
  tilesByChunk: Map<string, Tile[]>,
  libByUrl: Map<string, CustomTile>,
): Promise<{ ok: boolean; errorMessage?: string }> {
  const [cx, cy] = chunkKey.split(',').map(Number);
  const list = tilesByChunk.get(chunkKey) ?? [];
  const chunkTiles = list.map(t => serializeTileForChunkPersistence(t, libByUrl));

  let result: { error: { message?: string; code?: string; details?: string; hint?: string } | null };
  try {
    result = await supabase
      .from('map_chunks')
      .upsert(
        {
          chunk_x: cx,
          chunk_y: cy,
          tile_data: chunkTiles,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chunk_x,chunk_y' },
      )
      .abortSignal(AbortSignal.timeout(MAP_CHUNK_UPSERT_TIMEOUT_MS));
  } catch (e) {
    const isTimeout =
      e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError');
    const errorMessage = isTimeout
      ? `Save map region (${cx},${cy}) timed out after ${Math.round(MAP_CHUNK_UPSERT_TIMEOUT_MS / 1000)}s — check your network connection and try again.`
      : e instanceof Error
        ? e.message
        : String(e);
    console.error(`[map_chunks] ${chunkKey}:`, e);
    return { ok: false, errorMessage };
  }

  const { error } = result;

  if (error) {
    const errorMessage = formatPostgrestError(error);
    console.error(
      `Failed to sync chunk [${cx}, ${cy}] ERROR DETAILS:`,
      JSON.stringify(error, null, 2),
    );
    return { ok: false, errorMessage };
  }
  chunkSyncFailCount.delete(chunkKey);
  return { ok: true };
}

async function flushChunkList(
  chunkKeys: string[],
  get: () => MapState,
): Promise<{ permanentFailures: string[]; hadRequeue: boolean; lastErrorMessage?: string }> {
  if (chunkKeys.length === 0) {
    return { permanentFailures: [], hadRequeue: false };
  }

  await ensureFreshSession();

  const state = get();
  const allTiles = state.tiles;
  const libByUrl = buildLibByUrl(state.customTiles);
  const tilesByChunk = groupTilesByChunk(allTiles);

  const failed: string[] = [];
  let lastErrorMessage: string | undefined;

  for (let i = 0; i < chunkKeys.length; i += CHUNK_UPSERT_CONCURRENCY) {
    const batch = chunkKeys.slice(i, i + CHUNK_UPSERT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(key => upsertChunkFromIndex(key, tilesByChunk, libByUrl)),
    );
    batch.forEach((key, idx) => {
      const r = results[idx];
      if (!r.ok) {
        failed.push(key);
        if (!lastErrorMessage && r.errorMessage) lastErrorMessage = r.errorMessage;
      }
    });
  }

  const permanentFailures: string[] = [];
  let hadRequeue = false;

  if (failed.length > 0) {
    let requeued = 0;
    for (const k of failed) {
      const n = (chunkSyncFailCount.get(k) ?? 0) + 1;
      if (n <= MAX_CHUNK_SYNC_ATTEMPTS) {
        chunkSyncFailCount.set(k, n);
        pendingChunks.add(k);
        requeued++;
        hadRequeue = true;
      } else {
        permanentFailures.push(k);
        console.error(
          `[map] Chunk ${k} failed to save after ${MAX_CHUNK_SYNC_ATTEMPTS} attempts — fix errors above or use Export in the sidebar to back up your map.`,
        );
        chunkSyncFailCount.delete(k);
      }
    }
    if (requeued > 0) {
      console.warn(
        `[map] Re-queued ${requeued} chunk(s) after failed save — will retry after debounce`,
      );
      armChunkFlush(get);
    }
  }

  return { permanentFailures, hadRequeue, lastErrorMessage };
}

/**
 * Wait for the previous global sync to finish, but give up after a timeout
 * so a single stuck flush can't block all future saves indefinitely.
 */
async function waitForPreviousSync(): Promise<void> {
  try {
    await Promise.race([
      globalSyncPromise,
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error('Previous save took too long — starting new save anyway.')),
          GLOBAL_SYNC_WAIT_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (e) {
    console.warn('[chunkSync]', e instanceof Error ? e.message : e);
  }
}

function armChunkFlush(get: () => MapState) {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }

  batchTimeout = setTimeout(() => {
    const chunksToProcess = Array.from(pendingChunks);
    pendingChunks.clear();
    batchTimeout = null;

    if (chunksToProcess.length === 0) return;

    const doFlush = async () => {
      await waitForPreviousSync();
      reportChunkSaveUi({ status: 'saving' });
      const result = await flushChunkList(chunksToProcess, get);
      reportAfterFlushResult(result);
    };

    globalSyncPromise = doFlush().catch(err => {
      console.error('Global chunk sync sequence error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      reportChunkSaveUi({
        status: 'error',
        error: `Map save failed: ${msg}`,
      });
    });
  }, CHUNK_DEBOUNCE_MS);
}

/**
 * Runs immediately: cancels the debounced timer and persists all pending dirty chunks now.
 * Call on tab hide / before unload so short edits are not lost.
 */
export function flushPendingChunkSyncsNow(get: () => MapState): Promise<void> {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
  const chunksToProcess = Array.from(pendingChunks);
  pendingChunks.clear();
  if (chunksToProcess.length === 0) return Promise.resolve();

  reportChunkSaveUi({ status: 'saving' });

  const doFlush = async () => {
    await waitForPreviousSync();
    const result = await flushChunkList(chunksToProcess, get);
    reportAfterFlushResult(result);
  };

  globalSyncPromise = doFlush().catch(err => {
    console.error('flushPendingChunkSyncsNow error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    reportChunkSaveUi({
      status: 'error',
      error: `Could not finish save before leaving: ${msg}`,
    });
  });
  return globalSyncPromise;
}

/** Queue many chunks but arm the debounced flush only once (avoids N timer resets). */
export const queueChunkSyncs = (chunkKeys: string[], get: () => MapState) => {
  for (const key of chunkKeys) {
    pendingChunks.add(key);
    chunkSyncFailCount.delete(key);
  }
  if (chunkKeys.length === 0) return;
  reportChunkSaveUi({
    status: 'pending',
    pendingChunkCount: pendingChunks.size,
  });
  armChunkFlush(get);
};

export const triggerChunkSync = (chunkX: number, chunkY: number, get: () => MapState) => {
  queueChunkSyncs([`${chunkX},${chunkY}`], get);
};
