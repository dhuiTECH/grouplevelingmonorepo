import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBootStore } from '@/store/useBootStore';
import { initAssetDirectory, downloadAssetIfMissing, stripUrlParams } from '@/utils/assetManager';
import {
  fetchManifestVersion,
  buildAssetManifest,
  computeManifestFingerprint,
} from '@/utils/assetManifest';

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
      console.log(
        `[SyncEngine] Server manifest version unchanged (${remoteVersion}), skipping manifest query`,
      );
      useBootStore.getState().setProgress(100);
      useBootStore.getState().setBootStep('READY');
      return;
    }

    let manifest: string[];
    try {
      manifest = await buildAssetManifest();
    } catch (err) {
      console.warn('[SyncEngine] Failed to build manifest, skipping asset download:', err);
      manifest = [];
    }
    if (currentRunId !== runId) return;

    if (manifest.length === 0) {
      useBootStore.getState().setProgress(100);
      useBootStore.getState().setBootStep('READY');
      return;
    }

    const newFingerprint = computeManifestFingerprint(manifest);
    const versionToStore = remoteVersion ?? newFingerprint;

    if (cached && cached.fingerprint === newFingerprint) {
      console.log('[SyncEngine] Manifest fingerprint unchanged, skipping asset downloads');
      await saveCachedManifest(newFingerprint, manifest, versionToStore);
      useBootStore.getState().setProgress(100);
      useBootStore.getState().setBootStep('READY');
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
      useBootStore.getState().setProgress(100);
      useBootStore.getState().setBootStep('READY');
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

    useBootStore.getState().setBootStep('READY');
  } catch (err: unknown) {
    if (currentRunId !== runId) return;
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during update.';
    useBootStore.getState().setErrorMessage(message);
    useBootStore.getState().setBootStep('ERROR');
  }
}
