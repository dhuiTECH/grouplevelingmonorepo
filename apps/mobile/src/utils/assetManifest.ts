import { supabase } from '@/lib/supabase';
import { stripUrlParams } from '@/utils/assetManager';

export interface GameDataPayload {
  encounterPool: any[];
  customTiles: any[];
  skills: any[];
  skillAnimations: any[];
  shopItems: any[];
  worldMapNodes: any[];
  worldMapSettings: any | null;
  commonFoods: any[];
  classes: any[];
  activeMapId: string | null;
}

function extractUrls(rows: any[], ...keys: string[]): string[] {
  const urls: string[] = [];
  for (const row of rows) {
    for (const key of keys) {
      const val = row?.[key];
      if (typeof val === 'string' && val.trim()) urls.push(val.trim());
    }
  }
  return urls;
}

function extractJsonbUrls(rows: any[], path: (obj: any) => unknown): string[] {
  const urls: string[] = [];
  for (const row of rows) {
    try {
      const val = path(row);
      if (typeof val === 'string' && val.trim()) urls.push(val.trim());
    } catch {}
  }
  return urls;
}

function dedupeUrls(allUrls: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const url of allUrls) {
    const clean = stripUrlParams(url);
    if (!seen.has(clean)) {
      seen.add(clean);
      deduped.push(url);
    }
  }
  return deduped;
}

export async function fetchManifestVersion(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_asset_manifest_version');
    if (error) {
      console.warn('[AssetManifest] get_asset_manifest_version RPC failed:', error.message);
      return null;
    }
    return typeof data === 'string' ? data : null;
  } catch (err) {
    console.warn('[AssetManifest] get_asset_manifest_version RPC unavailable:', err);
    return null;
  }
}

export async function buildFullManifest(): Promise<{ urls: string[]; gameData: GameDataPayload }> {
  const [
    encounterRes,
    settingsRes,
    shopRes,
    nodesRes,
    skillsRes,
    classesRes,
    skillAnimRes,
    tilesRes,
    foodsRes,
    mapsRes,
  ] = await Promise.all([
    supabase.from('encounter_pool').select('*'),
    supabase.from('world_map_settings').select('*').eq('id', 1).single(),
    supabase.from('shop_items').select('*'),
    supabase.from('world_map_nodes').select('*'),
    supabase.from('skills').select('*'),
    supabase.from('classes').select('*'),
    supabase.from('skill_animations').select('*').then(
      (res) => res,
      () => ({ data: null, error: null }),
    ),
    supabase.from('custom_tiles').select('*'),
    supabase.from('common_foods').select('*').then(
      (res) => res,
      () => ({ data: null, error: null }),
    ),
    supabase.from('maps').select('id').eq('is_active', true).single(),
  ]);

  if (encounterRes.error) console.warn('[AssetManifest] encounter_pool query failed:', encounterRes.error.message);
  if (settingsRes.error) console.warn('[AssetManifest] world_map_settings query failed:', settingsRes.error.message);
  if (shopRes.error) console.warn('[AssetManifest] shop_items query failed:', shopRes.error.message);
  if (nodesRes.error) console.warn('[AssetManifest] world_map_nodes query failed:', nodesRes.error.message);
  if (skillsRes.error) console.warn('[AssetManifest] skills query failed:', skillsRes.error.message);
  if (classesRes.error) console.warn('[AssetManifest] classes query failed:', classesRes.error.message);
  if (skillAnimRes.error) console.warn('[AssetManifest] skill_animations query failed:', skillAnimRes.error);
  if (tilesRes.error) console.warn('[AssetManifest] custom_tiles query failed:', tilesRes.error.message);
  if (foodsRes.error) console.warn('[AssetManifest] common_foods query failed:', foodsRes.error);
  if (mapsRes.error) console.warn('[AssetManifest] maps query failed:', mapsRes.error.message);

  const gameData: GameDataPayload = {
    encounterPool: encounterRes.data ?? [],
    customTiles: tilesRes.data ?? [],
    skills: skillsRes.data ?? [],
    skillAnimations: skillAnimRes.data ?? [],
    shopItems: shopRes.data ?? [],
    worldMapNodes: nodesRes.data ?? [],
    worldMapSettings: settingsRes.data ?? null,
    commonFoods: foodsRes.data ?? [],
    classes: classesRes.data ?? [],
    activeMapId: mapsRes.data?.id ?? null,
  };

  const allUrls: string[] = [];

  if (encounterRes.data) {
    allUrls.push(...extractUrls(encounterRes.data, 'icon_url'));
    allUrls.push(...extractJsonbUrls(encounterRes.data, (r) => r.metadata?.visuals?.monster_url));
    allUrls.push(...extractJsonbUrls(encounterRes.data, (r) => r.metadata?.visuals?.bg_url));
    allUrls.push(...extractJsonbUrls(encounterRes.data, (r) => r.metadata?.visuals?.walking_spritesheet?.url));
    allUrls.push(...extractJsonbUrls(encounterRes.data, (r) => r.metadata?.visuals?.spritesheet?.url));
  }

  if (settingsRes.data) {
    const s = settingsRes.data;
    const settingKeys = [
      'autotile_sheet_url', 'dirt_sheet_url', 'dirtv2_sheet_url',
      'water_sheet_url', 'waterv2_sheet_url', 'foam_sheet_url',
    ];
    for (const key of settingKeys) {
      const val = s[key];
      if (typeof val === 'string' && val.trim()) allUrls.push(val.trim());
    }
  }

  if (shopRes.data) {
    allUrls.push(...extractUrls(shopRes.data, 'image_url', 'thumbnail_url'));
  }

  if (nodesRes.data) {
    allUrls.push(...extractUrls(nodesRes.data, 'icon_url'));
  }

  if (skillsRes.data) {
    allUrls.push(...extractUrls(skillsRes.data, 'icon_url'));
  }

  if (classesRes.data) {
    allUrls.push(...extractUrls(classesRes.data, 'icon_url'));
  }

  if (skillAnimRes.data) {
    allUrls.push(...extractUrls(skillAnimRes.data, 'sprite_url'));
  }

  return { urls: dedupeUrls(allUrls), gameData };
}

export async function buildAssetManifest(): Promise<string[]> {
  const { urls } = await buildFullManifest();
  return urls;
}

export function computeManifestFingerprint(urls: string[]): string {
  const normalized = urls.map((u) => stripUrlParams(u));
  normalized.sort();
  const joined = normalized.join('\n');
  let h1 = 0x811c9dc5;
  for (let i = 0; i < joined.length; i++) {
    h1 ^= joined.charCodeAt(i);
    h1 = (h1 * 0x01000193) | 0;
  }
  let h2 = 0;
  for (let i = 0; i < joined.length; i++) {
    h2 = ((h2 << 5) - h2 + joined.charCodeAt(i)) | 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}
