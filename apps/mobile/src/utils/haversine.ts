const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Geodesic distance between two WGS84 points (meters). */
export function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Sum of Haversine segment lengths along a path (meters). */
export function haversinePathLengthMeters(points: { latitude: number; longitude: number }[]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += haversineMeters(points[i - 1], points[i]);
  }
  return sum;
}

/**
 * OGC WKT LINESTRING for PostGIS ST_GeomFromText (lon lat order per vertex).
 */
export function coordsToLineStringWkt(points: { latitude: number; longitude: number }[]): string | null {
  if (points.length < 2) return null;
  const pairs = points.map((p) => `${p.longitude} ${p.latitude}`).join(', ');
  return `LINESTRING(${pairs})`;
}
