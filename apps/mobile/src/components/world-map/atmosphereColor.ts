/**
 * Screen-space multiply tint for world map (local clock).
 * Returns rgba() — multiply with white-ish / low alpha at noon, stronger at night.
 */

interface RgbaStop {
  /** Hour 0–24 */
  hour: number;
  r: number;
  g: number;
  b: number;
  /** Premultiplied-friendly alpha for the overlay */
  a: number;
}

const STOPS: RgbaStop[] = [
  { hour: 0, r: 22, g: 18, b: 48, a: 0.7 },
  { hour: 5, r: 35, g: 28, b: 62, a: 0.52 },
  { hour: 7, r: 255, g: 210, b: 170, a: 0.14 },
  { hour: 10, r: 255, g: 252, b: 245, a: 0.04 },
  { hour: 14, r: 255, g: 255, b: 255, a: 0.02 },
  { hour: 17, r: 255, g: 200, b: 150, a: 0.1 },
  { hour: 19, r: 255, g: 140, b: 95, a: 0.16 },
  { hour: 21, r: 55, g: 45, b: 95, a: 0.42 },
  { hour: 24, r: 22, g: 18, b: 48, a: 0.7 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Fractional hour in [0, 24) from Date */
export function getFractionalHour(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/**
 * Multiply overlay color for SkiaRect. Near-white at midday, cooler/darker at night.
 */
export function getAtmosphereMultiplyColor(date: Date): string {
  let h = getFractionalHour(date);
  if (h < 0) h = 0;
  if (h >= 24) h = 23.99;

  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (h >= a.hour && h <= b.hour) {
      const t = b.hour === a.hour ? 0 : (h - a.hour) / (b.hour - a.hour);
      const r = Math.round(lerp(a.r, b.r, t));
      const g = Math.round(lerp(a.g, b.g, t));
      const bl = Math.round(lerp(a.b, b.b, t));
      const al = lerp(a.a, b.a, t);
      return `rgba(${r}, ${g}, ${bl}, ${al})`;
    }
  }

  const last = STOPS[STOPS.length - 1];
  return `rgba(${last.r}, ${last.g}, ${last.b}, ${last.a})`;
}
