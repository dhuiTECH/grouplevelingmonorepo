/** When true, external workout import UI and `importExternalWorkout` are active (after prebuild + native adapters). */
export const ENABLE_EXTERNAL_WORKOUT_SYNC =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_ENABLE_EXTERNAL_WORKOUT_SYNC === 'true';
