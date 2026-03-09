/** 
 * Common constants and helper functions for LayeredAvatar components.
 */

export const FALLBACK_STATIC_SIZE = 512;

// Standard matrix to invert alpha channel if needed for masking operations
export const INVERT_ALPHA_MATRIX = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, -1, 1,
];

/** Increases saturation by percent for darker skin tones to prevent ashy look on OLED. */
export function increaseSaturationForDarkSkin(hex: string, percentIncrease: number = 10): string {
  const clean = hex.replace(/^#/, '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  if (l >= 0.5) return hex;
  const newS = Math.min(1, s * (1 + percentIncrease / 100));
  const c = (1 - Math.abs(2 * l - 1)) * newS;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r2 = 0, g2 = 0, b2 = 0;
  if (h < 1/6) { r2 = c; g2 = x; b2 = 0; }
  else if (h < 2/6) { r2 = x; g2 = c; b2 = 0; }
  else if (h < 3/6) { r2 = 0; g2 = c; b2 = x; }
  else if (h < 4/6) { r2 = 0; g2 = x; b2 = c; }
  else if (h < 5/6) { r2 = x; g2 = 0; b2 = c; }
  else { r2 = c; g2 = 0; b2 = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

/** Helper to convert hex to RGB array [R, G, B] normalized 0-1 */
export const hexToRgb = (hex: string) => {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
};

export function getEffectiveGender(item: any, fallbackGender?: string): 'male' | 'female' {
  const fallback = (fallbackGender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
  if (!item?.gender) return fallback;

  let genders: string[] = [];
  try {
    if (typeof item.gender === 'string' && item.gender.startsWith('[')) {
      genders = JSON.parse(item.gender);
    } else if (Array.isArray(item.gender)) {
      genders = item.gender;
    } else {
      genders = [item.gender];
    }
  } catch {
    genders = [item.gender];
  }

  const normalized = genders.map((gender: string) => String(gender).toLowerCase());
  if (normalized.includes('female') && !normalized.includes('male')) return 'female';
  if (normalized.includes('male') && !normalized.includes('female')) return 'male';
  return fallback;
}
