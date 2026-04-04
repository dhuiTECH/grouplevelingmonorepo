import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { applyLocationSample } from '@/lib/runRecordingLocation';

/** Must match the task name passed to startLocationUpdatesAsync */
export const LOCATION_TASK_NAME = 'GROUP_LEVELING_BACKGROUND_LOCATION';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[LOCATION_TASK]', error);
    return;
  }
  if (!data) return;

  const payload = data as { locations?: Location.LocationObject[] };
  const locations = payload.locations;
  if (!locations?.length) return;

  for (const loc of locations) {
    await applyLocationSample(loc);
  }
});
