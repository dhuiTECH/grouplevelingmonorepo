import * as FileSystem from 'expo-file-system/legacy';

const ASSET_DIR = FileSystem.documentDirectory + 'game_assets/';

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

export function getLocalAssetUri(url: string): string {
  const clean = url.split('?')[0];
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
