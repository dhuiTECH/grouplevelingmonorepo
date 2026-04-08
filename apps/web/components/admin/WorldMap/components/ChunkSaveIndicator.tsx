'use client';

import React, { useEffect } from 'react';
import { useMapStore } from '@/lib/store/mapStore';
import { Loader2, Check, AlertCircle, CloudUpload } from 'lucide-react';

const RECENT_SAVED_MS = 120_000;
const AUTO_CLEAR_SAVED_MS = 2800;
/** Failsafe if UI never leaves saving (large maps = many waves; each chunk can take up to MAP_CHUNK_UPSERT_TIMEOUT_MS). */
const STUCK_SAVING_MS = 30 * 60 * 1000;
/** Failsafe for endless Unsaved (e.g. debounce never completing). Long painting sessions can exceed this. */
const STUCK_PENDING_MS = 8 * 60 * 1000;

/**
 * Toolbar pill for map chunk persistence: pending debounce, saving to Supabase, saved, or error.
 */
export const ChunkSaveIndicator = React.memo(function ChunkSaveIndicator() {
  const chunkSaveStatus = useMapStore((s) => s.chunkSaveStatus);
  const pendingChunkCount = useMapStore((s) => s.chunkSavePendingChunkCount);
  const chunkSaveError = useMapStore((s) => s.chunkSaveError);
  const chunkSaveLastSyncError = useMapStore((s) => s.chunkSaveLastSyncError);
  const chunkSaveLastSavedAt = useMapStore((s) => s.chunkSaveLastSavedAt);
  const setChunkSaveUi = useMapStore((s) => s.setChunkSaveUi);

  useEffect(() => {
    if (chunkSaveStatus !== 'saved') return;
    const t = window.setTimeout(() => {
      setChunkSaveUi({ status: 'idle' });
    }, AUTO_CLEAR_SAVED_MS);
    return () => window.clearTimeout(t);
  }, [chunkSaveStatus, setChunkSaveUi]);

  /** Endless saving / unsaved failsafe (per-request timeouts in chunkSync handle most hangs). */
  useEffect(() => {
    if (chunkSaveStatus !== 'saving' && chunkSaveStatus !== 'pending') return;
    const isSaving = chunkSaveStatus === 'saving';
    const ms = isSaving ? STUCK_SAVING_MS : STUCK_PENDING_MS;
    const t = window.setTimeout(() => {
      const current = useMapStore.getState().chunkSaveStatus;
      if (current !== (isSaving ? 'saving' : 'pending')) return;
      useMapStore.getState().setChunkSaveUi({
        status: 'error',
        error: isSaving
          ? 'Save stayed in progress too long — try Export from the sidebar, check Network, then refresh if needed.'
          : 'Unsaved for too long — stop editing for a second so uploads can run, or use Export. You can refresh if the editor feels stuck.',
      });
    }, ms);
    return () => window.clearTimeout(t);
  }, [chunkSaveStatus]);

  const recentSaved =
    chunkSaveStatus === 'idle' &&
    chunkSaveLastSavedAt != null &&
    Date.now() - chunkSaveLastSavedAt < RECENT_SAVED_MS;

  if (chunkSaveStatus === 'idle' && !recentSaved) {
    return null;
  }

  if (chunkSaveStatus === 'error' && chunkSaveError) {
    return (
      <div
        className="pointer-events-auto max-w-[min(440px,92vw)] rounded-xl border border-red-500/40 bg-red-950/90 px-3 py-2 text-[10px] font-semibold text-red-100 shadow-2xl backdrop-blur-md"
        title={chunkSaveError}
      >
        <div className="flex gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <span className="leading-snug break-words">{chunkSaveError}</span>
        </div>
      </div>
    );
  }

  if (chunkSaveStatus === 'saving') {
    return (
      <div className="pointer-events-auto max-w-[min(440px,92vw)] rounded-xl border border-cyan-500/30 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
          <Loader2 size={14} className="shrink-0 animate-spin text-cyan-400" />
          Saving map…
        </div>
        {chunkSaveLastSyncError ? (
          <p
            className="mt-1.5 border-t border-cyan-500/20 pt-1.5 text-[9px] font-normal normal-case leading-snug tracking-normal text-rose-200/95 break-words"
            title={chunkSaveLastSyncError}
          >
            {chunkSaveLastSyncError}
          </p>
        ) : null}
      </div>
    );
  }

  if (chunkSaveStatus === 'pending') {
    return (
      <div className="pointer-events-auto max-w-[min(440px,92vw)] rounded-xl border border-amber-500/35 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur-md">
        <div
          className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-amber-100"
          title="Changes are batched; they upload shortly after you stop editing."
        >
          <CloudUpload size={14} className="shrink-0 text-amber-400" />
          Unsaved
          {pendingChunkCount > 0 ? (
            <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-[9px] text-amber-200">
              {pendingChunkCount} region{pendingChunkCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {chunkSaveLastSyncError ? (
          <p
            className="mt-1.5 border-t border-amber-500/25 pt-1.5 text-[9px] font-normal normal-case leading-snug tracking-normal text-rose-200/95 break-words"
            title={chunkSaveLastSyncError}
          >
            Last error: {chunkSaveLastSyncError}
          </p>
        ) : null}
      </div>
    );
  }

  if (chunkSaveStatus === 'saved') {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-slate-900/95 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-100 shadow-2xl backdrop-blur-md">
        <Check size={14} className="text-emerald-400" />
        Saved
      </div>
    );
  }

  if (recentSaved && chunkSaveLastSavedAt != null) {
    return (
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-slate-700/50 bg-slate-900/90 px-3 py-1.5 text-[10px] text-slate-400 shadow-xl backdrop-blur-md">
        <Check size={12} className="text-emerald-600/90" />
        <span className="tabular-nums">
          Saved {new Date(chunkSaveLastSavedAt).toLocaleTimeString()}
        </span>
      </div>
    );
  }

  return null;
});

ChunkSaveIndicator.displayName = 'ChunkSaveIndicator';
