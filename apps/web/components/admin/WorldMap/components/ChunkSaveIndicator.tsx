'use client';

import React, { useEffect } from 'react';
import { useMapStore } from '@/lib/store/mapStore';
import { Loader2, Check, AlertCircle, CloudUpload } from 'lucide-react';

const RECENT_SAVED_MS = 120_000;
const AUTO_CLEAR_SAVED_MS = 2800;

/**
 * Toolbar pill for map chunk persistence: pending debounce, saving to Supabase, saved, or error.
 */
export const ChunkSaveIndicator = React.memo(function ChunkSaveIndicator() {
  const chunkSaveStatus = useMapStore((s) => s.chunkSaveStatus);
  const pendingChunkCount = useMapStore((s) => s.chunkSavePendingChunkCount);
  const chunkSaveError = useMapStore((s) => s.chunkSaveError);
  const chunkSaveLastSavedAt = useMapStore((s) => s.chunkSaveLastSavedAt);
  const setChunkSaveUi = useMapStore((s) => s.setChunkSaveUi);

  useEffect(() => {
    if (chunkSaveStatus !== 'saved') return;
    const t = window.setTimeout(() => {
      setChunkSaveUi({ status: 'idle' });
    }, AUTO_CLEAR_SAVED_MS);
    return () => window.clearTimeout(t);
  }, [chunkSaveStatus, setChunkSaveUi]);

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
        className="pointer-events-auto flex max-w-[min(320px,40vw)] items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/90 px-3 py-2 text-[10px] font-semibold text-red-100 shadow-2xl backdrop-blur-md"
        title={chunkSaveError}
      >
        <AlertCircle size={14} className="shrink-0 text-red-400" />
        <span className="leading-tight line-clamp-2">{chunkSaveError}</span>
      </div>
    );
  }

  if (chunkSaveStatus === 'saving') {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/95 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-cyan-200 shadow-2xl backdrop-blur-md">
        <Loader2 size={14} className="animate-spin text-cyan-400" />
        Saving map…
      </div>
    );
  }

  if (chunkSaveStatus === 'pending') {
    return (
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-500/35 bg-slate-900/95 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-100 shadow-2xl backdrop-blur-md"
        title="Changes are batched; they upload shortly after you stop editing."
      >
        <CloudUpload size={14} className="text-amber-400" />
        Unsaved
        {pendingChunkCount > 0 ? (
          <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-[9px] text-amber-200">
            {pendingChunkCount} region{pendingChunkCount === 1 ? '' : 's'}
          </span>
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
