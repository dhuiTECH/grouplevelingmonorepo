import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBootStore } from '@/store/useBootStore';
import { useGameDataStore } from '@/store/useGameDataStore';
import { useUserGameDataStore } from '@/store/useUserGameDataStore';
import { useEncounterPoolStore } from '@/store/useEncounterPoolStore';
import { supabase } from '@/lib/supabase';
import { initAssetDirectory, downloadAssetIfMissing, stripUrlParams, cleanupOrphanedAssets } from '@/utils/assetManager';
import {
  fetchManifestVersion,
  buildFullManifest,
  computeManifestFingerprint,
} from '@/utils/assetManifest';
import type { GameDataPayload } from '@/utils/assetManifest';

const CONCURRENT_DOWNLOADS = 6;
const MANIFEST_FINGERPRINT_KEY = 'asset_manifest_fingerprint';
const MANIFEST_URLS_KEY = 'asset_manifest_urls';
const MANIFEST_VERSION_KEY = 'asset_manifest_version';

let currentRunId = 0;

interface CachedManifest {
  fingerprint: string;
  urls: string[];
  version: string;
}

async function loadCachedManifest(): Promise<CachedManifest | null> {
  try {
    const [fp, raw, ver] = await Promise.all([
      AsyncStorage.getItem(MANIFEST_FINGERPRINT_KEY),
      AsyncStorage.getItem(MANIFEST_URLS_KEY),
      AsyncStorage.getItem(MANIFEST_VERSION_KEY),
    ]);
    if (fp && raw && ver) {
      const urls = JSON.parse(raw) as string[];
      if (Array.isArray(urls)) return { fingerprint: fp, urls, version: ver };
    }
  } catch (err) {
    console.warn('[SyncEngine] Failed to load cached manifest:', err);
  }
  return null;
}

async function saveCachedManifest(
  fingerprint: string,
  urls: string[],
  version: string,
): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [MANIFEST_FINGERPRINT_KEY, fingerprint],
      [MANIFEST_URLS_KEY, JSON.stringify(urls)],
      [MANIFEST_VERSION_KEY, version],
    ]);
  } catch (err) {
    console.warn('[SyncEngine] Failed to save cached manifest:', err);
  }
}

async function downloadUrls(
  urls: string[],
  runId: number,
): Promise<{ completed: number; failed: number }> {
  let completed = 0;
  let failed = 0;
  const totalFiles = urls.length;

  const queue = [...urls];
  const runWorker = async () => {
    while (queue.length > 0) {
      if (currentRunId !== runId) return;
      const url = queue.shift()!;
      try {
        const result = await downloadAssetIfMissing(url);
        if (!result) failed++;
      } catch {
        failed++;
      }
      completed++;
      if (currentRunId !== runId) return;
      useBootStore.getState().setProgress(Math.round((completed / totalFiles) * 100));
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCURRENT_DOWNLOADS, urls.length) },
    () => runWorker(),
  );
  await Promise.all(workers);

  return { completed, failed };
}

function diffManifests(oldUrls: string[], newUrls: string[]): string[] {
  const oldSet = new Set(oldUrls.map((u) => stripUrlParams(u)));
  return newUrls.filter((u) => !oldSet.has(stripUrlParams(u)));
}

function populateGameDataStores(gameData: GameDataPayload): void {
  useGameDataStore.getState().setAll({
    encounterPool: gameData.encounterPool,
    customTiles: gameData.customTiles,
    skills: gameData.skills,
    skillAnimations: gameData.skillAnimations,
    shopItems: gameData.shopItems,
    worldMapNodes: gameData.worldMapNodes,
    worldMapSettings: gameData.worldMapSettings,
    commonFoods: gameData.commonFoods,
    classes: gameData.classes,
    activeMapId: gameData.activeMapId,
  });

  if (gameData.activeMapId && gameData.encounterPool.length > 0) {
    const mapId = gameData.activeMapId;
    const forMap = gameData.encounterPool.filter(
      (e: any) => e.map_id === mapId || e.map_id === null || e.map_id === undefined,
    );
    useEncounterPoolStore.getState().setPoolForMap(mapId, forMap);
  }

  console.log(
    `[SyncEngine] Game data cached: ${gameData.encounterPool.length} encounters, ` +
    `${gameData.skills.length} skills, ${gameData.shopItems.length} shop items, ` +
    `${gameData.customTiles.length} tiles, ${gameData.worldMapNodes.length} nodes, ` +
    `${gameData.skillAnimations.length} anims, ${gameData.commonFoods.length} foods`,
  );
}

async function finishBoot(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await syncUserGameData(session.user.id);
    }
  } catch (err) {
    console.warn('[SyncEngine] User data boot sync failed (non-blocking):', err);
  }
  useBootStore.getState().setProgress(100);
  useBootStore.getState().setBootStep('READY');
}

export async function checkForUpdates(): Promise<void> {
  const runId = ++currentRunId;

  useBootStore.getState().setErrorMessage(null);
  useBootStore.getState().setProgress(0);
  useBootStore.getState().setBootStep('INITIALIZING');

  try {
    await initAssetDirectory();
    if (currentRunId !== runId) return;

    useBootStore.getState().setBootStep('CHECKING_VERSION');

    const cached = await loadCachedManifest();
    if (currentRunId !== runId) return;

    const remoteVersion = await fetchManifestVersion();
    if (currentRunId !== runId) return;

    if (cached && remoteVersion && cached.version === remoteVersion) {
      await useGameDataStore.getState().waitForHydration();
      await useUserGameDataStore.getState().waitForHydration();

      const store = useGameDataStore.getState();
      const storeHasData = store.skills.length > 0
        && store.encounterPool.length > 0
        && store.shopItems.length > 0
        && store.worldMapNodes.length > 0
        && store.worldMapSettings !== null
        && store.customTiles.length > 0;
      if (!storeHasData) {
        console.log(
          `[SyncEngine] Version unchanged but game-data store is empty (upgrade?), fetching full manifest`,
        );
      } else {
        console.log(
          `[SyncEngine] Server manifest version unchanged (${remoteVersion}), skipping manifest query`,
        );
        await finishBoot();
        return;
      }
    }

    let manifest: string[];
    let gameData: GameDataPayload | null = null;
    try {
      const result = await buildFullManifest();
      manifest = result.urls;
      gameData = result.gameData;
    } catch (err) {
      console.warn('[SyncEngine] Failed to build manifest, skipping asset download:', err);
      manifest = [];
    }
    if (currentRunId !== runId) return;

    if (gameData) {
      await useGameDataStore.getState().waitForHydration();
      populateGameDataStores(gameData);
    }

    if (manifest.length === 0) {
      await finishBoot();
      return;
    }

    const newFingerprint = computeManifestFingerprint(manifest);
    const versionToStore = remoteVersion ?? newFingerprint;

    if (cached && cached.fingerprint === newFingerprint) {
      console.log('[SyncEngine] Manifest fingerprint unchanged, skipping asset downloads');
      await saveCachedManifest(newFingerprint, manifest, versionToStore);
      await finishBoot();
      return;
    }

    useBootStore.getState().setBootStep('DOWNLOADING');

    let downloadQueue: string[];
    if (cached) {
      downloadQueue = diffManifests(cached.urls, manifest);
      console.log(
        `[SyncEngine] Manifest changed: ${downloadQueue.length} new asset(s) to download (${manifest.length} total)`,
      );
    } else {
      downloadQueue = manifest;
      console.log(`[SyncEngine] First boot: downloading ${manifest.length} asset(s)`);
    }

    if (downloadQueue.length === 0) {
      await saveCachedManifest(newFingerprint, manifest, versionToStore);
      await finishBoot();
      return;
    }

    const { failed } = await downloadUrls(downloadQueue, runId);
    if (currentRunId !== runId) return;

    if (failed > 0) {
      console.warn(`[SyncEngine] ${failed}/${downloadQueue.length} assets failed to download`);
      console.warn('[SyncEngine] Skipping cache update due to download failures; will retry next boot');
    } else {
      await saveCachedManifest(newFingerprint, manifest, versionToStore);
    }

    cleanupOrphanedAssets(manifest).catch((err) => {
      console.warn('[SyncEngine] Asset cleanup failed:', err);
    });

    await finishBoot();
  } catch (err: unknown) {
    if (currentRunId !== runId) return;
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during update.';
    useBootStore.getState().setErrorMessage(message);
    useBootStore.getState().setBootStep('ERROR');
  }
}

export async function syncUserGameData(userId: string, force = false): Promise<void> {
  await useUserGameDataStore.getState().waitForHydration();
  const store = useUserGameDataStore.getState();

  if (!force) {
    const hasPets = store.pets[userId] !== undefined;
    const hasSkills = store.userSkills[userId] !== undefined;
    const hasLoadout = store.skillLoadout[userId] !== undefined;
    if (hasPets && hasSkills && hasLoadout) {
      console.log('[SyncEngine] User game data already cached for', userId);
      return;
    }
  }

  console.log('[SyncEngine] Fetching user game data for', userId);
  try {
    const [petsRes, skillsRes, profileRes] = await Promise.all([
      supabase
        .from('user_pets')
        .select('*, pet_details:encounter_pool(*)')
        .eq('user_id', userId),
      supabase.from('user_skills').select('*').eq('user_id', userId),
      supabase.from('profiles').select('skill_loadout').eq('id', userId).single(),
    ]);

    if (petsRes.data) {
      useUserGameDataStore.getState().setPets(userId, petsRes.data);
    }
    if (skillsRes.data) {
      useUserGameDataStore.getState().setUserSkills(userId, skillsRes.data);
    }
    if (profileRes.data) {
      useUserGameDataStore.getState().setSkillLoadout(
        userId,
        profileRes.data.skill_loadout ?? [],
      );
    }

    console.log(
      `[SyncEngine] User data cached: ${petsRes.data?.length ?? 0} pets, ` +
      `${skillsRes.data?.length ?? 0} skills, loadout=${!!profileRes.data?.skill_loadout}`,
    );
  } catch (err) {
    console.warn('[SyncEngine] Failed to sync user game data:', err);
  }
}
