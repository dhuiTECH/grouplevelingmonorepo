import { useBootStore } from '@/store/useBootStore';
import { initAssetDirectory, downloadAssetIfMissing } from '@/utils/assetManager';
import { buildAssetManifest } from '@/utils/assetManifest';

const CONCURRENT_DOWNLOADS = 6;

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

    let manifest: string[];
    try {
      manifest = await buildAssetManifest();
    } catch (err) {
      console.warn('[SyncEngine] Failed to build manifest, skipping asset download:', err);
      manifest = [];
    }
    if (currentRunId !== runId) return;

    useBootStore.getState().setBootStep('DOWNLOADING');

    if (manifest.length === 0) {
      useBootStore.getState().setProgress(100);
      useBootStore.getState().setBootStep('READY');
      return;
    }

    const totalFiles = manifest.length;
    let completed = 0;
    let failed = 0;

    const queue = [...manifest];
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
      { length: Math.min(CONCURRENT_DOWNLOADS, manifest.length) },
      () => runWorker(),
    );
    await Promise.all(workers);

    if (currentRunId !== runId) return;

    if (failed > 0) {
      console.warn(`[SyncEngine] ${failed}/${totalFiles} assets failed to download`);
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
