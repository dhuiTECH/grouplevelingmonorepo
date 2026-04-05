import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChestTier } from '@/screens/runCompleteChestRng';

export interface WagerFlipResult {
  ok: boolean;
  won?: boolean;
  final_chest_type?: ChestTier;
  new_coins?: number;
  error?: string;
  /** True when RPC was missing and __DEV__ simulated the flip (coins not saved to DB). */
  devFallback?: boolean;
}

let devFallbackRpcHintLogged = false;

function tierAfterWin(base: ChestTier): ChestTier {
  if (base === 'small') return 'silver';
  if (base === 'silver') return 'medium';
  if (base === 'medium') return 'large';
  return 'small';
}

/**
 * Calls `wager_run_chest_flip` (requires migration `20260414120000_daily_run_chest_rpcs.sql` on Supabase).
 * In __DEV__, if PostgREST returns PGRST202 (function not in schema), simulates the flip for UI testing only.
 */
export async function callWagerRunChestFlip(
  supabase: SupabaseClient,
  base: ChestTier,
  currentCoins: number
): Promise<WagerFlipResult> {
  const { data, error } = await supabase.rpc('wager_run_chest_flip', { p_base_tier: base });

  if (!error && data && typeof data === 'object') {
    const d = data as {
      ok?: boolean;
      won?: boolean;
      final_chest_type?: ChestTier;
      new_coins?: number;
      error?: string;
    };
    if (d.ok === true) {
      return {
        ok: true,
        won: d.won === true,
        final_chest_type: d.final_chest_type,
        new_coins: d.new_coins,
      };
    }
    if (d.ok === false) {
      return { ok: false, error: typeof d.error === 'string' ? d.error : 'wager_failed' };
    }
  }

  if (
    __DEV__ &&
    error &&
    (error as { code?: string }).code === 'PGRST202'
  ) {
    if (!devFallbackRpcHintLogged) {
      devFallbackRpcHintLogged = true;
      console.warn(
        '[wagerRunChestFlip] RPC missing on remote DB (PGRST202). Using dev-only flip; coins not persisted. Apply migration 20260414120000_daily_run_chest_rpcs.sql in Supabase SQL Editor, or: cd apps/web && npx supabase link && npx supabase db push'
      );
    }
    if (currentCoins < 500) {
      return { ok: false, error: 'insufficient_coins', devFallback: true };
    }
    const won = Math.random() < 0.5;
    const final_chest_type: ChestTier = won ? tierAfterWin(base) : 'small';
    const new_coins = Math.max(0, currentCoins - 500);
    return {
      ok: true,
      won,
      final_chest_type,
      new_coins,
      devFallback: true,
    };
  }

  return {
    ok: false,
    error: error?.message ?? (data as { error?: string } | null)?.error ?? 'wager_failed',
  };
}
