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

export function getPetIdleFrame(petDetails: any): number | null {
  const walkSheet = petDetails?.metadata?.visuals?.walking_spritesheet;
  if (!walkSheet) return null;
  const idleFrame = toNumber(walkSheet?.idle_frame);
  if (idleFrame == null || idleFrame < 0) return null;
  return Math.floor(idleFrame);
}

export function getPetSpriteSource(petDetails: any, animationType: 'idle' | 'walking' = 'idle'): string | null {
  const metadata = petDetails?.metadata;
  const visuals = metadata?.visuals;
  const walkSheet = visuals?.walking_spritesheet;

  // Walking animation
  if (animationType === 'walking') {
    const walkingUrl = toStringOrNull(walkSheet?.url) ?? toStringOrNull(visuals?.walking_spritesheet_url);
    if (walkingUrl) return walkingUrl;
  }

  // Idle: if an idle_frame is set on the walking sheet, use the walking spritesheet as source
  if (animationType === 'idle') {
    const idleFrame = toNumber(walkSheet?.idle_frame);
    if (idleFrame != null && idleFrame >= 0) {
      const walkingUrl = toStringOrNull(walkSheet?.url);
      if (walkingUrl) return walkingUrl;
    }
  }

  // Fallback to legacy idle sprite sources
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

export function getPetSpriteConfig(petDetails: any, animationType: 'idle' | 'walking' = 'idle'): PetSpriteConfig | null {
  const metadata = petDetails?.metadata;
  const visuals = metadata?.visuals;
  const walkSheet = visuals?.walking_spritesheet;

  // For idle: if idle_frame is configured on the walking sheet, return walking config
  // so PetLayeredAvatar knows the strip dimensions for the static frame
  if (animationType === 'idle') {
    const idleFrame = toNumber(walkSheet?.idle_frame);
    if (idleFrame != null && idleFrame >= 0 && walkSheet?.url) {
      const frameWidth = toNumber(walkSheet?.frame_width) ?? 64;
      const frameHeight = toNumber(walkSheet?.frame_height) ?? 64;
      const totalFrames = toNumber(walkSheet?.frame_count) ?? 1;
      const durationMs = toNumber(walkSheet?.duration_ms);
      let fps = 10;
      if (durationMs != null && durationMs > 0 && totalFrames > 1) {
        fps = (totalFrames * 1000) / durationMs;
      }
      fps = Math.min(60, Math.max(1, fps));
      if (totalFrames <= 1) return null;
      return {
        totalFrames: Math.max(2, Math.floor(totalFrames)),
        fps,
        frameWidth: Math.max(1, Math.floor(frameWidth)),
        frameHeight: Math.max(1, Math.floor(frameHeight)),
      };
    }
  }

  // Walking animation config
  if (animationType === 'walking' && walkSheet) {
    const frameWidth = toNumber(walkSheet?.frame_width) ?? 64;
    const frameHeight = toNumber(walkSheet?.frame_height) ?? 64;
    const totalFrames = toNumber(walkSheet?.frame_count) ?? 1;
    const durationMs = toNumber(walkSheet?.duration_ms);
    let fps = 10;
    if (durationMs != null && durationMs > 0 && totalFrames > 1) {
      fps = (totalFrames * 1000) / durationMs;
    }
    fps = Math.min(60, Math.max(1, fps));
    if (totalFrames <= 1) return null;
    return {
      totalFrames: Math.max(2, Math.floor(totalFrames)),
      fps,
      frameWidth: Math.max(1, Math.floor(frameWidth)),
      frameHeight: Math.max(1, Math.floor(frameHeight)),
    };
  }

  // Legacy fallback: animation_config (for old idle-only pets)
  if (animationType === 'idle') {
    const animCfg = metadata?.animation_config;
    if (animCfg && typeof animCfg === 'object') {
      const frameWidth = toNumber(animCfg.frame_width) ?? toNumber(animCfg.frameWidth) ?? 64;
      const frameHeight = toNumber(animCfg.frame_height) ?? toNumber(animCfg.frameHeight) ?? 64;
      const totalFrames = toNumber(animCfg.frame_count) ?? toNumber(animCfg.frameCount) ?? toNumber(animCfg.totalFrames) ?? 1;
      const durationMs = toNumber(animCfg.duration_ms) ?? toNumber(animCfg.durationMs);
      let fps = 10;
      if (durationMs != null && durationMs > 0 && totalFrames > 1) {
        fps = (totalFrames * 1000) / durationMs;
      }
      fps = Math.min(60, Math.max(1, fps));
      if (totalFrames <= 1) return null;
      return {
        totalFrames: Math.max(2, Math.floor(totalFrames)),
        fps,
        frameWidth: Math.max(1, Math.floor(frameWidth)),
        frameHeight: Math.max(1, Math.floor(frameHeight)),
      };
    }
  }

  return null;
}
