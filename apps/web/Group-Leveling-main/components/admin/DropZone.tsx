"use client";

import React, { useState, useCallback } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string; // e.g. "audio/*", "image/*"
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  /** If true, only the first file is passed to onFiles as a single-item array */
  single?: boolean;
}

function acceptMatch(accept: string | undefined, file: File): boolean {
  if (!accept) return true;
  const patterns = accept.split(',').map((s) => s.trim().toLowerCase());
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  for (const p of patterns) {
    if (p.endsWith('/*')) {
      const prefix = p.slice(0, -1);
      if (type.startsWith(prefix) || type === p) return true;
    }
    if (p === type) return true;
    if (p.startsWith('.') && name.endsWith(p)) return true;
  }
  return false;
}

export default function DropZone({
  onFiles,
  accept,
  disabled = false,
  className = '',
  children,
  single = true,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      const items = e.dataTransfer?.files;
      if (!items?.length) return;
      const files = Array.from(items).filter((file) =>
        acceptMatch(accept, file)
      );
      if (files.length === 0) return;
      const toSend = single ? files.slice(0, 1) : files;
      onFiles(toSend);
    },
    [accept, disabled, single, onFiles]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative transition-colors rounded-xl border-2 border-dashed ${
        isDragOver
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-gray-700 hover:border-gray-600'
      } ${disabled ? 'pointer-events-none opacity-60' : ''} ${className}`}
    >
      {children}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 z-10 pointer-events-none">
          <span className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Drop file here
          </span>
        </div>
      )}
    </div>
  );
}
