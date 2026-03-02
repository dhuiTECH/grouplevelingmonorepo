export interface PetSpriteConfig {
  totalFrames: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s ? s : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function getPetSpriteSource(petDetails: any, animationType: 'idle' | 'walking' = 'idle'): string | null {
  const metadata = petDetails?.metadata;
  const visuals = metadata?.visuals;

  // Try walking specific source first if requested
  if (animationType === 'walking') {
    const walkingUrl =
      toStringOrNull(visuals?.walking_spritesheet?.url) ??
      toStringOrNull(visuals?.walking_spritesheet_url) ??
      toStringOrNull(metadata?.walking_spritesheet_url);
    if (walkingUrl) return walkingUrl;
  }

  // Default / Idle source
  const fromMetadata =
    toStringOrNull(visuals?.monster_url) ??
    toStringOrNull(visuals?.sprite_url) ??
    toStringOrNull(visuals?.spritesheet_url) ??
    toStringOrNull(visuals?.spritesheet?.url) ??
    toStringOrNull(metadata?.sprite_url) ??
    toStringOrNull(metadata?.spritesheet_url);

  return (
    fromMetadata ??
    toStringOrNull(petDetails?.icon_url) ??
    toStringOrNull(petDetails?.image_url)
  );
}

export function getPetIdleFrame(petDetails: any): number | null {
  const metadata = petDetails?.metadata;
  const visuals = metadata?.visuals;
  const sheet = visuals?.spritesheet;
  if (!sheet) return null;
  const idleFrame = toNumber(sheet?.idle_frame);
  if (idleFrame == null || idleFrame < 0) return null;
  return Math.floor(idleFrame);
}

export function getPetSpriteConfig(petDetails: any, animationType: 'idle' | 'walking' = 'idle'): PetSpriteConfig | null {
  const metadata = petDetails?.metadata;

  // 1) Primary source: metadata.visuals (from Admin Panel MobsTab.tsx)
  let sheet: any = null;
  if (metadata && typeof metadata === 'object') {
    const visuals = (metadata as any).visuals;
    if (visuals && typeof visuals === 'object') {
      if (animationType === 'walking') {
        sheet = (visuals as any).walking_spritesheet ?? (visuals as any).spritesheet ?? null;
      } else {
        sheet = (visuals as any).spritesheet ?? null;
      }
    }
  }

  let frameWidth: number | null = null;
  let frameHeight: number | null = null;
  let totalFrames: number | null = null;
  let durationMs: number | null = null;

  if (sheet && typeof sheet === 'object') {
    frameWidth = toNumber((sheet as any).frame_width);
    frameHeight = toNumber((sheet as any).frame_height);
    totalFrames = toNumber((sheet as any).frame_count);
    durationMs = toNumber((sheet as any).duration_ms);
  } else if (metadata && typeof metadata === 'object' && animationType === 'idle') {
    // 2) Fallback: legacy/shop items via animation_config (only for idle)
    const animCfg = (metadata as any).animation_config;
    if (animCfg && typeof animCfg === 'object') {
      frameWidth =
        toNumber((animCfg as any).frame_width) ??
        toNumber((animCfg as any).frameWidth);
      frameHeight =
        toNumber((animCfg as any).frame_height) ??
        toNumber((animCfg as any).frameHeight);
      totalFrames =
        toNumber((animCfg as any).frame_count) ??
        toNumber((animCfg as any).frameCount) ??
        toNumber((animCfg as any).totalFrames);
      durationMs =
        toNumber((animCfg as any).duration_ms) ??
        toNumber((animCfg as any).durationMs);
    }
  }

  // Defaults (match MiniBattleSimulator behavior)
  if (frameWidth == null) frameWidth = 64;
  if (frameHeight == null) frameHeight = 64;
  if (totalFrames == null) totalFrames = 1;

  // FPS calculation: duration_ms first, then default to 10
  let fps: number;
  if (durationMs != null && durationMs > 0 && totalFrames > 1) {
    fps = (totalFrames * 1000) / durationMs;
  } else {
    fps = 10;
  }
  fps = Math.min(60, Math.max(1, fps));

  // Only treat as spritesheet when we actually have multiple frames
  if (totalFrames <= 1) return null;

  return {
    totalFrames: Math.max(2, Math.floor(totalFrames)),
    fps,
    frameWidth: Math.max(1, Math.floor(frameWidth)),
    frameHeight: Math.max(1, Math.floor(frameHeight)),
  };
}
