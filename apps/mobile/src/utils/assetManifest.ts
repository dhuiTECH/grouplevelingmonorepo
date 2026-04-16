import { supabase } from '@/lib/supabase';

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

export async function buildAssetManifest(): Promise<string[]> {
  const allUrls: string[] = [];

  const [
    encounterRes,
    settingsRes,
    shopRes,
    nodesRes,
    skillsRes,
    classesRes,
    skillAnimRes,
  ] = await Promise.all([
    supabase.from('encounter_pool').select('icon_url, metadata'),
    supabase.from('world_map_settings').select('autotile_sheet_url, dirt_sheet_url, dirtv2_sheet_url, water_sheet_url, waterv2_sheet_url, foam_sheet_url').eq('id', 1).single(),
    supabase.from('shop_items').select('image_url, thumbnail_url'),
    supabase.from('world_map_nodes').select('icon_url'),
    supabase.from('skills').select('icon_url'),
    supabase.from('classes').select('icon_url'),
    supabase.from('skill_animations').select('sprite_url').then(
      (res) => res,
      () => ({ data: null, error: null }),
    ),
  ]);

  if (encounterRes.error) console.warn('[AssetManifest] encounter_pool query failed:', encounterRes.error.message);
  if (settingsRes.error) console.warn('[AssetManifest] world_map_settings query failed:', settingsRes.error.message);
  if (shopRes.error) console.warn('[AssetManifest] shop_items query failed:', shopRes.error.message);
  if (nodesRes.error) console.warn('[AssetManifest] world_map_nodes query failed:', nodesRes.error.message);
  if (skillsRes.error) console.warn('[AssetManifest] skills query failed:', skillsRes.error.message);
  if (classesRes.error) console.warn('[AssetManifest] classes query failed:', classesRes.error.message);
  if (skillAnimRes.error) console.warn('[AssetManifest] skill_animations query failed:', skillAnimRes.error);

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

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const url of allUrls) {
    const clean = url.split('?')[0];
    if (!seen.has(clean)) {
      seen.add(clean);
      deduped.push(url);
    }
  }

  return deduped;
}
