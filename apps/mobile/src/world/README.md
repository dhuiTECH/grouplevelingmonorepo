# World Module Bundle

This folder is a non-invasive bundle for reviewing world-map code in one place.
It does not move existing files or change runtime behavior.

## Entry points

- `index.ts` - exports all world-related modules
- `hooks.ts` - world hooks
- `components.ts` - world map UI/components
- `screens.ts` - world screens
- `services.ts` - world sync/service hooks

## Source of truth file map

### Hooks

- `src/hooks/useExploration.ts`
- `src/hooks/useMapData.ts`
- `src/hooks/useMapCharacter.tsx`
- `src/hooks/useMapUIAnimations.ts`
- `src/hooks/useStepTracker.ts`
- `src/hooks/useLocalMovementBudget.ts`
- `src/hooks/useMapSessionSync.ts`

### Screen

- `src/screens/WorldMapScreen.tsx`
- `src/screens/WorldMapScreen.styles.ts`

### Components (world-map)

- `src/components/world-map/SkiaWorldMap.tsx`
- `src/components/world-map/SkiaTile.tsx`
- `src/components/world-map/useSkiaAssets.ts`
- `src/components/world-map/SkiaLayeredAvatar.tsx`
- `src/components/world-map/SkiaPetSprite.tsx`
- `src/components/world-map/SkiaSpritesheet.tsx`
- `src/components/world-map/DPad.tsx`
- `src/components/world-map/VirtualJoystick.tsx`
- `src/components/world-map/MapHUD.tsx`
- `src/components/world-map/MapLoadingOverlay.tsx`
- `src/components/world-map/MapNewsOverlay.tsx`
- `src/components/world-map/NavigationTargetArrow.tsx`
- `src/components/world-map/OfflineStepsModal.tsx`
- `src/components/world-map/WorldNodesLayer.tsx`
- `src/components/world-map/PartyMembersLayer.tsx`
- `src/components/world-map/TileRenderer.tsx`
- `src/components/world-map/mapUtils.ts`
- `src/components/world-map/HolographicGlass.tsx`
- `src/components/world-map/MapIcons.tsx`

### Modals used by world flow

- `src/components/modals/TravelMenu.tsx`
- `src/components/modals/InteractionModal.tsx`
- `src/components/modals/LevelUpModal.tsx`
- `src/components/modals/RaidCombatModal.tsx`
