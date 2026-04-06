import type { MaskPainterSecondaryReference } from './types';

export function isVideoFile(url: string) {
  return url.toLowerCase().endsWith('.webm') || url.toLowerCase().includes('.webm');
}

export function getGenderValue(
  gender: string | string[] | null | undefined
): string | string[] | null {
  const g = gender;
  if (Array.isArray(g)) {
    if (g.length === 0) return null;
    if (g.length === 1) return g[0];
    return g;
  }
  return (g as string) || null;
}

/**
 * Secondary layer in MaskPainter (e.g. hand grip when editing weapon, or weapon when editing hand_grip).
 */
export function buildMaskPainterSecondaryRef(
  shopItems: any[],
  formData: { slot: string; grip_type: string | null },
  maskGender: 'male' | 'female'
): MaskPainterSecondaryReference | undefined {
  const activePreviewGrip =
    formData.slot === 'weapon'
      ? formData.grip_type
      : formData.slot === 'hand_grip'
        ? formData.grip_type
        : null;

  if (!activePreviewGrip) return undefined;

  const targetSlot = formData.slot === 'weapon' ? 'hand_grip' : 'weapon';

  const refItem = shopItems.find((i: any) => {
    if (i.slot !== targetSlot || i.grip_type !== activePreviewGrip) return false;
    const itemGender = Array.isArray(i.gender) ? i.gender : [i.gender];
    return itemGender.includes(maskGender) || itemGender.includes('unisex');
  });

  if (!refItem?.image_url) return undefined;

  const isFemaleRef = maskGender === 'female';
  return {
    url: refItem.image_url,
    offsetX:
      isFemaleRef &&
      refItem.offset_x_female !== null &&
      refItem.offset_x_female !== undefined
        ? refItem.offset_x_female
        : refItem.offset_x || 0,
    offsetY:
      isFemaleRef &&
      refItem.offset_y_female !== null &&
      refItem.offset_y_female !== undefined
        ? refItem.offset_y_female
        : refItem.offset_y || 0,
    scale:
      isFemaleRef &&
      refItem.scale_female !== null &&
      refItem.scale_female !== undefined
        ? refItem.scale_female
        : refItem.scale || 1,
    rotation:
      isFemaleRef &&
      refItem.rotation_female !== null &&
      refItem.rotation_female !== undefined
        ? refItem.rotation_female
        : refItem.rotation || 0,
    zIndex: refItem.z_index,
    opacity: 1.0,
    useFullSize: targetSlot === 'hand_grip',
    isAnimated: !!refItem.is_animated,
    animConfig: refItem.animation_config
      ? typeof refItem.animation_config === 'string'
        ? JSON.parse(refItem.animation_config)
        : refItem.animation_config
      : undefined
  };
}
