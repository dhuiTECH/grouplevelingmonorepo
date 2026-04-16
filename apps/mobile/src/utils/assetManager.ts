import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASSET_DIR = FileSystem.documentDirectory + 'game_assets/';
const CLEANUP_TIMESTAMP_KEY = 'asset_cleanup_last_run';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const hashCache = new Map<string, string>();

function getHashedFilename(url: string): string {
  const cached = hashCache.get(url);
  if (cached) return cached;

  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    hash = (hash * 0x01000193) | 0;
  }
  const hex1 = (hash >>> 0).toString(16).padStart(8, '0');

  let hash2 = 0;
  for (let i = 0; i < url.length; i++) {
    hash2 = ((hash2 << 5) - hash2 + url.charCodeAt(i)) | 0;
  }
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');

  const ext = url.split('.').pop()?.split('?')[0]?.split('#')[0] || 'bin';
  const safeExt = ext.length <= 5 ? ext : 'bin';
  const filename = `${hex1}${hex2}.${safeExt}`;
  hashCache.set(url, filename);
  return filename;
}

export function stripUrlParams(url: string): string {
  return url.split('?')[0];
}

export function getLocalAssetUri(url: string): string {
  const clean = stripUrlParams(url);
  return ASSET_DIR + getHashedFilename(clean);
}

let dirInitialized = false;

export async function initAssetDirectory(): Promise<void> {
  if (dirInitialized) return;
  await FileSystem.makeDirectoryAsync(ASSET_DIR, { intermediates: true });
  dirInitialized = true;
}

export async function downloadAssetIfMissing(url: string): Promise<string | null> {
  const clean = url.split('?')[0];
  const localUri = getLocalAssetUri(clean);

  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists && info.size && info.size > 0) {
      return localUri;
    }

    const tmpUri = localUri + '.tmp';

    const result = await FileSystem.downloadAsync(url, tmpUri);

    if (result.status >= 200 && result.status < 300) {
      const tmpInfo = await FileSystem.getInfoAsync(tmpUri);
      if (tmpInfo.exists && tmpInfo.size && tmpInfo.size > 0) {
        await FileSystem.moveAsync({ from: tmpUri, to: localUri });
        return localUri;
      }
    }

    console.warn(`[AssetManager] Download failed (status ${result.status}) for: ${url}`);
    try { await FileSystem.deleteAsync(tmpUri, { idempotent: true }); } catch {}
    return null;
  } catch (err) {
    console.warn(`[AssetManager] Failed to download asset: ${url}`, err);
    try { await FileSystem.deleteAsync(localUri + '.tmp', { idempotent: true }); } catch {}
    return null;
  }
}

export async function cleanupOrphanedAssets(manifestUrls: string[]): Promise<{ deleted: number; errors: number }> {
  const shouldRun = await shouldRunCleanup();
  if (!shouldRun) {
    return { deleted: 0, errors: 0 };
  }

  let deleted = 0;
  let errors = 0;

  try {
    const referencedFilenames = new Set<string>();
    for (const url of manifestUrls) {
      const clean = url.split('?')[0];
      referencedFilenames.add(getHashedFilename(clean));
    }

    const entries = await FileSystem.readDirectoryAsync(ASSET_DIR);

    for (const entry of entries) {
      if (entry.endsWith('.tmp')) {
        try {
          await FileSystem.deleteAsync(ASSET_DIR + entry, { idempotent: true });
          deleted++;
        } catch {
          errors++;
        }
        continue;
      }

      if (!referencedFilenames.has(entry)) {
        try {
          await FileSystem.deleteAsync(ASSET_DIR + entry, { idempotent: true });
          deleted++;
        } catch {
          errors++;
        }
      }
    }

    await AsyncStorage.setItem(CLEANUP_TIMESTAMP_KEY, Date.now().toString());

    if (deleted > 0 || errors > 0) {
      console.log(`[AssetManager] Cleanup complete: ${deleted} deleted, ${errors} errors`);
    }
  } catch (err) {
    console.warn('[AssetManager] Cleanup failed:', err);
  }

  return { deleted, errors };
}

export async function getCacheSizeBytes(): Promise<number> {
  try {
    const entries = await FileSystem.readDirectoryAsync(ASSET_DIR);
    let totalSize = 0;

    for (const entry of entries) {
      try {
        const info = await FileSystem.getInfoAsync(ASSET_DIR + entry);
        if (info.exists && info.size) {
          totalSize += info.size;
        }
      } catch {}
    }

    return totalSize;
  } catch {
    return 0;
  }
}

export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function shouldRunCleanup(): Promise<boolean> {
  try {
    const lastRun = await AsyncStorage.getItem(CLEANUP_TIMESTAMP_KEY);
    if (!lastRun) return true;
    const elapsed = Date.now() - parseInt(lastRun, 10);
    return elapsed >= ONE_DAY_MS;
  } catch {
    return true;
  }
}
