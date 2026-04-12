import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/contexts/NotificationContext';
import type { User, UserCosmetic, ShopItem } from '@/types/user';
import { RARITY_COLORS } from '@/constants/gameConstants';
import { playHunterSound } from '@/utils/audio';

const RPG_CLASSES = ['Assassin', 'Fighter', 'Mage', 'Tanker', 'Ranger', 'Healer'] as const;
type RpgClass = (typeof RPG_CLASSES)[number];

interface RecipeIngredientRow {
  id: string;
  material_item_id: string;
  quantity_required: number;
}

interface RecipeOutcomeRow {
  id: string;
  output_item_id: string;
  weight: number;
}

interface CraftingRecipeRow {
  id: string;
  recipe_name: string;
  gold_cost: number;
  is_active: boolean;
  recipe_ingredients: RecipeIngredientRow[];
  recipe_outcomes: RecipeOutcomeRow[];
}

function aggregateIngredients(rows: RecipeIngredientRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.material_item_id, (m.get(r.material_item_id) ?? 0) + r.quantity_required);
  }
  return m;
}

function quantityOwned(user: User, shopItemId: string): number {
  let sum = 0;
  for (const c of user.cosmetics ?? []) {
    if (c.shop_item_id === shopItemId) sum += c.quantity ?? 1;
  }
  return sum;
}

function applyRecipeCost(user: User, goldCost: number, ingredients: RecipeIngredientRow[]): User {
  const need = aggregateIngredients(ingredients);
  const cosmetics = [...(user.cosmetics ?? [])];

  for (const [materialId, req] of need) {
    let remaining = req;
    for (let i = 0; i < cosmetics.length && remaining > 0; i++) {
      const c = cosmetics[i];
      if (c.shop_item_id !== materialId) continue;
      const q = c.quantity ?? 1;
      const take = Math.min(q, remaining);
      remaining -= take;
      const newQ = q - take;
      if (newQ <= 0) {
        cosmetics.splice(i, 1);
        i -= 1;
      } else {
        cosmetics[i] = { ...c, quantity: newQ };
      }
    }
  }

  return {
    ...user,
    coins: Math.max(0, (user.coins ?? 0) - goldCost),
    cosmetics,
  };
}

function revertUser(snapshot: User): User {
  return {
    ...snapshot,
    cosmetics: snapshot.cosmetics?.map((c) => ({ ...c })) ?? [],
  };
}

function mergeWonItem(user: User, wonItemId: string, shopItem: ShopItem): User {
  const cosmetics = [...(user.cosmetics ?? [])];
  const idx = cosmetics.findIndex((c) => c.shop_item_id === wonItemId);
  if (idx >= 0) {
    const c = cosmetics[idx];
    const q = c.quantity ?? 1;
    cosmetics[idx] = {
      ...c,
      quantity: Math.min(999, q + 1),
      shop_items: shopItem,
    };
  } else {
    const row: UserCosmetic = {
      id: `craft-${wonItemId}-${Date.now()}`,
      user_id: user.id,
      shop_item_id: wonItemId,
      equipped: false,
      quantity: 1,
      created_at: new Date().toISOString(),
      shop_items: shopItem,
    };
    cosmetics.push(row);
  }
  return { ...user, cosmetics };
}

export interface BlacksmithUIProps {
  user: User;
  setUser: (u: User | null) => void;
  refreshGameData: () => void | Promise<void>;
}

export function BlacksmithUI({ user, setUser, refreshGameData }: BlacksmithUIProps) {
  const { showNotification } = useNotification();
  const [recipes, setRecipes] = useState<CraftingRecipeRow[]>([]);
  const [shopById, setShopById] = useState<Record<string, ShopItem>>({});
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [activeClass, setActiveClass] = useState<RpgClass>('Fighter');
  const [isForging, setIsForging] = useState(false);
  const [revealItem, setRevealItem] = useState<ShopItem | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoadingRecipes(true);
    try {
      const { data: recipeRows, error } = await supabase
        .from('crafting_recipes')
        .select(
          `
          id,
          recipe_name,
          gold_cost,
          is_active,
          recipe_ingredients ( id, material_item_id, quantity_required ),
          recipe_outcomes ( id, output_item_id, weight )
        `
        )
        .eq('is_active', true);

      if (error) throw error;

      const list = (recipeRows ?? []) as CraftingRecipeRow[];
      setRecipes(list);

      const ids = new Set<string>();
      for (const r of list) {
        for (const ing of r.recipe_ingredients ?? []) ids.add(ing.material_item_id);
        for (const o of r.recipe_outcomes ?? []) ids.add(o.output_item_id);
      }

      if (ids.size === 0) {
        setShopById({});
        return;
      }

      const { data: items, error: itemErr } = await supabase
        .from('shop_items')
        .select('*')
        .in('id', [...ids]);

      if (itemErr) throw itemErr;

      const map: Record<string, ShopItem> = {};
      for (const it of items ?? []) {
        map[it.id] = it as ShopItem;
      }
      setShopById(map);
    } catch (e) {
      console.error('BlacksmithUI loadRecipes', e);
      showNotification('Could not load forging recipes.', 'error');
    } finally {
      setLoadingRecipes(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const recipesForClass = useMemo(() => {
    return recipes.filter((r) => {
      const outs = r.recipe_outcomes ?? [];
      if (outs.length === 0) return false;
      return outs.some((o) => {
        const item = shopById[o.output_item_id];
        if (!item) return false;
        const cr = item.class_req;
        if (!cr || cr === 'All') return true;
        return cr === activeClass;
      });
    });
  }, [recipes, shopById, activeClass]);

  const canAfford = useCallback(
    (recipe: CraftingRecipeRow) => {
      if ((user.coins ?? 0) < recipe.gold_cost) return false;
      const need = aggregateIngredients(recipe.recipe_ingredients ?? []);
      for (const [matId, qty] of need) {
        if (quantityOwned(user, matId) < qty) return false;
      }
      return true;
    },
    [user]
  );

  const onForge = async (recipe: CraftingRecipeRow) => {
    if (!canAfford(recipe) || isForging) return;
    playHunterSound('click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const snap = revertUser(user);
    setUser(applyRecipeCost(user, recipe.gold_cost, recipe.recipe_ingredients ?? []));
    setIsForging(true);

    try {
      const { data, error } = await supabase.rpc('craft_rng_item', {
        p_player_id: user.id,
        p_recipe_id: recipe.id,
      });

      if (error) throw error;

      const payload = data as { success?: boolean; won_item_id?: string } | null;
      const wonId = payload?.won_item_id;
      if (!payload?.success || !wonId) {
        throw new Error('Unexpected forge response');
      }

      let item: ShopItem | undefined = shopById[wonId];
      if (!item) {
        const { data: itemRow, error: itemErr } = await supabase
          .from('shop_items')
          .select('*')
          .eq('id', wonId)
          .maybeSingle();
        if (itemErr || !itemRow) throw new Error('Won item not found');
        item = itemRow as ShopItem;
        setShopById((prev) => ({ ...prev, [wonId]: item! }));
      }

      setUser((prev) => (prev ? mergeWonItem(prev, wonId, item!) : prev));
      setRevealItem(item);
      playHunterSound('purchasesuccess');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void refreshGameData();
    } catch (e: unknown) {
      console.error('craft_rng_item', e);
      setUser(snap);
      playHunterSound('error');
      showNotification(
        typeof e === 'object' && e && 'message' in e ? String((e as Error).message) : 'Forging failed.',
        'error'
      );
    } finally {
      setIsForging(false);
    }
  };

  const closeReveal = () => setRevealItem(null);

  const rarityColor = (r?: string) => {
    const key = (r ?? 'common').toUpperCase();
    return RARITY_COLORS[key] ?? RARITY_COLORS['COMMON'];
  };

  if (loadingRecipes) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.muted}>Loading forge…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classTabs} contentContainerStyle={styles.classTabsInner}>
        {RPG_CLASSES.map((cls) => (
          <TouchableOpacity
            key={cls}
            onPress={() => setActiveClass(cls)}
            style={[styles.classPill, activeClass === cls && styles.classPillActive]}
          >
            <Text style={[styles.classPillText, activeClass === cls && styles.classPillTextActive]}>{cls}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {recipesForClass.length === 0 ? (
          <Text style={styles.muted}>No recipes for this class yet.</Text>
        ) : (
          recipesForClass.map((recipe) => {
            const totalW = (recipe.recipe_outcomes ?? []).reduce((s, o) => s + o.weight, 0) || 1;
            const affordable = canAfford(recipe);
            return (
              <View key={recipe.id} style={styles.card}>
                <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>
                <Text style={styles.goldLine}>
                  Gold: <Text style={styles.goldValue}>{recipe.gold_cost}</Text>
 {(user.coins ?? 0) < recipe.gold_cost ? (
                    <Text style={styles.bad}> (not enough)</Text>
                  ) : null}
                </Text>

                <Text style={styles.sectionLabel}>Materials</Text>
                {(recipe.recipe_ingredients ?? []).map((ing) => {
                  const mat = shopById[ing.material_item_id];
                  const owned = quantityOwned(user, ing.material_item_id);
                  const ok = owned >= ing.quantity_required;
                  return (
                    <Text key={ing.id} style={[styles.line, ok ? styles.ok : styles.bad]}>
                      {(mat?.name ?? ing.material_item_id.slice(0, 8)) + '…'} × {ing.quantity_required}{' '}
                      <Text style={styles.dim}>(have {owned})</Text>
                    </Text>
                  );
                })}

                <Text style={styles.sectionLabel}>Possible results</Text>
                {(recipe.recipe_outcomes ?? []).map((o) => {
                  const it = shopById[o.output_item_id];
                  const pct = Math.round((o.weight / totalW) * 1000) / 10;
                  return (
                    <Text key={o.id} style={styles.outcomeLine}>
                      <Text style={{ color: rarityColor(it?.rarity) }}>{(it?.rarity ?? '?').toUpperCase()}</Text>
                      {' — '}
                      {it?.name ?? o.output_item_id.slice(0, 8) + '…'} ({pct}%)
                    </Text>
                  );
                })}

                <TouchableOpacity
                  style={[styles.forgeBtn, (!affordable || isForging) && styles.forgeBtnDisabled]}
                  disabled={!affordable || isForging}
                  onPress={() => onForge(recipe)}
                >
                  <Text style={styles.forgeBtnText}>Forge</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={isForging} transparent animationType="fade">
        <View style={styles.forgingOverlay}>
                   <MotiView
            from={{ scale: 0.95, opacity: 0.75 }}
            animate={{ scale: 1.05, opacity: 1 }}
            transition={{ type: 'timing', duration: 800, loop: true }}
            style={styles.forgingCard}
          >
            <Text style={styles.forgingTitle}>Forging in progress…</Text>
            <Text style={styles.forgingSub}>The anvil decides your fate.</Text>
            <ActivityIndicator size="large" color="#fbbf24" style={{ marginTop: 16 }} />
          </MotiView>
        </View>
      </Modal>

      <Modal visible={!!revealItem} transparent animationType="slide">
        <Pressable style={styles.revealOverlay} onPress={closeReveal}>
          <Pressable style={styles.revealCard} onPress={(e) => e.stopPropagation()}>
            {revealItem ? (
              <>
                <Text style={[styles.revealRarity, { color: rarityColor(revealItem.rarity) }]}>
                  {(revealItem.rarity ?? 'common').toUpperCase()}
                </Text>
                <Text style={styles.revealName}>{revealItem.name}</Text>
                {revealItem.image_url ? (
                  <Image source={{ uri: revealItem.image_url }} style={styles.revealImg} contentFit="contain" />
                ) : null}
                <TouchableOpacity style={styles.revealClose} onPress={closeReveal}>
                  <Text style={styles.revealCloseText}>Claim</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  muted: { color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  classTabs: { maxHeight: 44, marginBottom: 8 },
  classTabsInner: { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  classPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  classPillActive: { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' },
  classPillText: { color: '#94a3b8', fontWeight: '600', fontSize: 12 },
  classPillTextActive: { color: '#fbbf24' },
  list: { flex: 1 },
  listContent: { paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  recipeTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  goldLine: { color: '#cbd5e1', marginBottom: 8 },
  goldValue: { color: '#fbbf24', fontWeight: '700' },
  sectionLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 6, marginBottom: 4, letterSpacing: 1 },
  line: { color: '#e2e8f0', fontSize: 14, marginBottom: 2 },
  outcomeLine: { color: '#e2e8f0', fontSize: 13, marginBottom: 2 },
  ok: { color: '#4ade80' },
  bad: { color: '#f87171' },
  dim: { color: '#64748b' },
  forgeBtn: {
    marginTop: 12,
    backgroundColor: '#b45309',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  forgeBtnDisabled: { opacity: 0.45 },
  forgeBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  forgingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  forgingCard: {
    backgroundColor: '#1e293b',
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
    minWidth: 280,
  },
  forgingTitle: { color: '#fbbf24', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  forgingSub: { color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  revealOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  revealCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  revealRarity: { fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  revealName: { color: '#f8fafc', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  revealImg: { width: 200, height: 200, marginVertical: 8 },
  revealClose: {
    marginTop: 16,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  revealCloseText: { color: '#0f172a', fontWeight: '900' },
});
