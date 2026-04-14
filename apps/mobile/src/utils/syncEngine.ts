import { useBootStore } from '@/store/useBootStore';
import { initAssetDirectory, downloadAssetIfMissing } from '@/utils/assetManager';

const ASSET_MANIFEST: string[] = [
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png',
];

let currentRunId = 0;

export async function checkForUpdates(): Promise<void> {
  const runId = ++currentRunId;

  useBootStore.getState().setErrorMessage(null);
  useBootStore.getState().setProgress(0);
  useBootStore.getState().setBootStep('INITIALIZING');

  try {
    await initAssetDirectory();
    if (currentRunId !== runId) return;

    useBootStore.getState().setBootStep('CHECKING_VERSION');

    if (currentRunId !== runId) return;

    useBootStore.getState().setBootStep('DOWNLOADING');

    const totalFiles = ASSET_MANIFEST.length;
    let completed = 0;

    for (const url of ASSET_MANIFEST) {
      if (currentRunId !== runId) return;
      await downloadAssetIfMissing(url);
      if (currentRunId !== runId) return;
      completed++;
      useBootStore.getState().setProgress(Math.round((completed / totalFiles) * 100));
    }

    if (currentRunId !== runId) return;
    useBootStore.getState().setBootStep('READY');
  } catch (err: unknown) {
    if (currentRunId !== runId) return;
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during update.';
    useBootStore.getState().setErrorMessage(message);
    useBootStore.getState().setBootStep('ERROR');
  }
}
