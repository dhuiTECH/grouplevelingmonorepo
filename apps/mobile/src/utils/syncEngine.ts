import { useBootStore } from '@/store/useBootStore';

const DOWNLOAD_DURATION_MS = 3000;
const TICK_INTERVAL_MS = 50;

let currentRunId = 0;

export async function checkForUpdates(): Promise<void> {
  const runId = ++currentRunId;
  const store = useBootStore.getState();

  store.setErrorMessage(null);
  store.setProgress(0);
  store.setBootStep('INITIALIZING');

  try {
    await delay(300);
    if (currentRunId !== runId) return;

    useBootStore.getState().setBootStep('CHECKING_VERSION');

    await delay(500);
    if (currentRunId !== runId) return;

    useBootStore.getState().setBootStep('DOWNLOADING');

    const totalTicks = Math.floor(DOWNLOAD_DURATION_MS / TICK_INTERVAL_MS);

    for (let i = 1; i <= totalTicks; i++) {
      await delay(TICK_INTERVAL_MS);
      if (currentRunId !== runId) return;
      const progress = Math.min(Math.round((i / totalTicks) * 100), 100);
      useBootStore.getState().setProgress(progress);
    }

    if (currentRunId !== runId) return;
    useBootStore.getState().setProgress(100);
    useBootStore.getState().setBootStep('READY');
  } catch (err: unknown) {
    if (currentRunId !== runId) return;
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during update.';
    useBootStore.getState().setErrorMessage(message);
    useBootStore.getState().setBootStep('ERROR');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
