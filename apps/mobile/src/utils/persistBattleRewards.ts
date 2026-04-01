import { supabase } from "@/lib/supabase";

/** Fire-and-forget from UI: merges with server `profiles.exp` / `profiles.coins`. */
export async function persistBattleRewards(
  userId: string,
  expGained: number,
  coinsGained: number,
): Promise<void> {
  try {
    const { data: profile, error: fetchErr } = await supabase
      .from("profiles")
      .select("exp, coins")
      .eq("id", userId)
      .single();
    if (fetchErr) throw fetchErr;
    const newExp = (Number(profile?.exp) || 0) + expGained;
    const newCoins = (Number(profile?.coins) || 0) + coinsGained;
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ exp: newExp, coins: newCoins })
      .eq("id", userId);
    if (upErr) throw upErr;
  } catch (e) {
    console.error("[persistBattleRewards]", e);
  }
}
