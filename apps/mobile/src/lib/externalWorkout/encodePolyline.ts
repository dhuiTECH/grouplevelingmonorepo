import polyline from '@mapbox/polyline';

/** Google-encoded polyline precision 5 (matches `RunPolylineMap` / `runUpload`). */
export function encodeRoutePolyline(
  points: { latitude: number; longitude: number }[]
): string {
  const pairs: [number, number][] = points.map((p) => [p.latitude, p.longitude]);
  return polyline.encode(pairs, 5);
}
