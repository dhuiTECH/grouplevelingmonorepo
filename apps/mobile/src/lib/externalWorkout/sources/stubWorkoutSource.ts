import type { ExternalWorkoutRoute, WorkoutSourceAdapter } from '../types';

export const stubWorkoutSource: WorkoutSourceAdapter = {
  id: 'stub',
  async isAvailable() {
    return false;
  },
  async listWorkouts(): Promise<ExternalWorkoutRoute[]> {
    return [];
  },
};
