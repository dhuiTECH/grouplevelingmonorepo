"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// The Map Engine uses Window and Canvas, so we must disable SSR
const WorldMapEngine = dynamic(
  () => import('@/components/admin/WorldMap/WorldMapEngine').then(mod => mod.WorldMapEngine),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }
);

export default function AdminMapPage() {
  return (
    <div className="h-screen w-full bg-black overflow-hidden">
      <WorldMapEngine />
    </div>
  );
}
