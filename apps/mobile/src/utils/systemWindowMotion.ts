import { Easing } from 'react-native-reanimated';

/** Matches `apps/web/app/globals.css` `system-window-open` + landing hero easing. */
export const SYSTEM_WINDOW_OPEN_MS = 550;

export const SYSTEM_WINDOW_OPEN_EASING = Easing.bezier(0.2, 0.9, 0.2, 1);

/** Thin horizontal strip → full panel (scaleY only). */
export const SYSTEM_WINDOW_FROM = {
  scaleX: 1,
  scaleY: 0.02,
  opacity: 0.35,
} as const;

export const SYSTEM_WINDOW_TO = {
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
} as const;

export const SYSTEM_WINDOW_TRANSITION = {
  type: 'timing' as const,
  duration: SYSTEM_WINDOW_OPEN_MS,
  easing: SYSTEM_WINDOW_OPEN_EASING,
};
