"use client";

import { useEffect } from 'react';
import { regenerateHPMP } from '@/lib/stats';

interface GameLoopProps {
  user: any;
  setUser: (u: any) => void;
  isAuthenticated: boolean;
  loadDungeons: () => void;
  loadShopItems: () => void;
}

export default function GlobalGameLoop({ 
  user, setUser, isAuthenticated, 
  loadDungeons, loadShopItems 
}: GameLoopProps) {

  // 1. Data Polling (Dungeons & Shop) - Every 30s
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollData = () => {
      // These functions should use SWR or React Query ideally, 
      // but calling them here is fine if they don't trigger heavy state updates 
      // unless data actually changes.
      loadDungeons();
      loadShopItems();
    };

    const interval = setInterval(pollData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadDungeons, loadShopItems]);

  // 2. HP/MP Regeneration - Every 60s
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const regenInterval = setInterval(async () => {
      // A. Trigger Server-Side Global Regen (Background Task)
      try {
        await fetch('/api/admin/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Global regen tick failed:', error);
      }

      // B. Client-Side Optimistic Update
      const regenData = await regenerateHPMP(user, 1); // 1 minute tick

      // Only update state if stats actually changed
      if (regenData.hpRegen > 0 || regenData.mpRegen > 0) {
        // Update Local State
        setUser((prev: any) => ({
          ...prev,
          current_hp: regenData.newHP,
          current_mp: regenData.newMP
        }));

        // Sync with Database
        try {
          await fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_hp: regenData.newHP,
              current_mp: regenData.newMP
            })
          });
        } catch (error) {
          console.error('Failed to sync HP/MP:', error);
        }
      }
    }, 60000); // 60 seconds

    return () => clearInterval(regenInterval);
  }, [user?.id, isAuthenticated, user?.current_hp, user?.current_mp]);

  // This component renders nothing
  return null;
}
