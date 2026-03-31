import { StyleSheet } from 'react-native';
import { HUD } from '@/components/battle/battleTheme';

export const battleScreenStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', overflow: 'visible' },
  gameFrame: {
    width: '100%',
    height: '100%',
    backgroundColor: '#050b14',
    position: 'relative',
    overflow: 'visible',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },

  battlefield: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 20,
    overflow: 'visible',
  },

  /** Battlefield SL-style labels: typography only, no navy panel */
  battleHudBare: {
    alignItems: 'center',
    maxWidth: '92%',
    paddingVertical: 6,
  },
  battleHudSystem: {
    color: HUD.systemLabel,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Exo2-Regular',
    marginBottom: 4,
  },
  battleHudTitle: {
    color: HUD.hunterCyan,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: 'Exo2-Regular',
  },
  battleHudTitlePet: {
    color: HUD.petViolet,
    letterSpacing: 3,
  },
  battleHudTitleEnemy: {
    color: HUD.enemyCrimson,
    letterSpacing: 3,
  },
  battleHudSub: {
    color: 'rgba(148, 163, 184, 0.95)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 6,
    fontFamily: 'Exo2-Regular',
  },
});
