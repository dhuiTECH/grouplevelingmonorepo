import { supabase } from "@/lib/supabase";

export type LootSourceType = "battle" | "chest" | "npc";

export interface LootItemGrant {
  shop_item_id: string;
  quantity: number;
  total_quantity?: number;
  user_cosmetic_id?: string;
}

export interface ClaimLootResult {
  ok: boolean;
  cached?: boolean;
  error?: string;
  source_type?: string;
  source_id?: string;
  entry_id?: string;
  exp_delta?: number;
  coins_delta?: number;
  gems_delta?: number;
  exp_total?: number;
  coins_total?: number;
  gems_total?: number;
  items?: LootItemGrant[];
}

/**
 * Calls the server-side `claim_loot` RPC. Idempotent — safe to retry with the
 * same key on network failure without risk of double-granting.
 *
 * Returns `{ ok: true, ... }` on success, `{ ok: false, error }` on RPC-level
 * failure (`rate_limited` = server cooldown between *new* claims; idempotent
 * retries with the same key are unaffected), and **throws** on network /
 * transport errors so callers can show a retry UI.
 */
export async function claimLoot(
  sourceType: LootSourceType,
  sourceId: string,
  idempotencyKey: string,
): Promise<ClaimLootResult> {
  const { data, error } = await supabase.rpc("claim_loot", {
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw error;

  const result = (data ?? {}) as ClaimLootResult;
  if (!result.ok && result.error) {
    console.warn("[claimLoot] RPC returned error:", result.error);
  }
  return result;
}
