import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the full modal stays nearly invisible so the inventory preview reads clearly */
const PEEK_MS = 1000;

/** Whole modal (backdrop + panel + items + nested details) fades together */
const PEEK_ROOT_OPACITY = 0.08;

/**
 * When equipping from gear / avatar / background modals, briefly drops the entire modal
 * subtree opacity so the hunter/pet preview behind it is clearly visible.
 */
export function useInventoryEquipPeek() {
  const [peek, setPeek] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const triggerPeek = useCallback(() => {
    setPeek(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPeek(false), PEEK_MS);
  }, []);

  return {
    rootOpacity: peek ? PEEK_ROOT_OPACITY : 1,
    triggerPeek,
  };
}
