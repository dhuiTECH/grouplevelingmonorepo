/**
 * Curated running / walking seeds (Greater Vancouver focus + a few Canada-wide anchors).
 * Names must stay unique (upsert on global_dungeons.name).
 */

export interface Hotspot {
  name: string;
  lat: number;
  lng: number;
  /** Target loop length for ORS round_trip; default applied in seeder if omitted */
  lengthMeters?: number;
}

/** Well-known parks, seawall segments, and neighborhoods — Metro Vancouver + a few Canada-wide anchors */
export const CURATED_HOTSPOTS: Hotspot[] = [
  // Vancouver core
  { name: 'Stanley Park — Prospect Point', lat: 49.313, lng: -123.144, lengthMeters: 5000 },
  { name: 'Stanley Park — Lost Lagoon', lat: 49.294, lng: -123.144, lengthMeters: 5000 },
  { name: 'English Bay — Sunset Beach', lat: 49.277, lng: -123.139, lengthMeters: 4000 },
  { name: 'False Creek — Granville Island', lat: 49.272, lng: -123.135, lengthMeters: 5000 },
  { name: 'False Creek — Olympic Village', lat: 49.272, lng: -123.108, lengthMeters: 5000 },
  { name: 'Science World — Creekside', lat: 49.273, lng: -123.104, lengthMeters: 5000 },
  { name: 'Kitsilano — Beach Park', lat: 49.275, lng: -123.152, lengthMeters: 5000 },
  { name: 'Kitsilano — Arbutus Greenway', lat: 49.265, lng: -123.157, lengthMeters: 6000 },
  { name: 'Vanier Park', lat: 49.276, lng: -123.146, lengthMeters: 4000 },
  { name: 'Queen Elizabeth Park', lat: 49.241, lng: -123.112, lengthMeters: 5000 },
  { name: 'Riley Park — Hillcrest', lat: 49.244, lng: -123.108, lengthMeters: 5000 },
  { name: 'Main Street — Mount Pleasant', lat: 49.264, lng: -123.101, lengthMeters: 5000 },
  { name: 'Commercial Drive — Grandview', lat: 49.275, lng: -123.069, lengthMeters: 5000 },
  { name: 'Trout Lake — John Hendry', lat: 49.255, lng: -123.061, lengthMeters: 5000 },
  { name: 'Renfrew Ravine', lat: 49.248, lng: -123.045, lengthMeters: 4000 },
  { name: 'Burnaby Lake — South', lat: 49.238, lng: -122.973, lengthMeters: 8000 },
  { name: 'Burnaby Lake — Piper Spit', lat: 49.246, lng: -122.988, lengthMeters: 6000 },
  { name: 'Deer Lake — South Shore', lat: 49.232, lng: -122.971, lengthMeters: 5000 },
  { name: 'Central Park — Burnaby', lat: 49.228, lng: -123.012, lengthMeters: 5000 },
  { name: 'Metrotown — Bonsor', lat: 49.225, lng: -123.003, lengthMeters: 5000 },
  { name: 'BCIT — South', lat: 49.249, lng: -123.003, lengthMeters: 5000 },
  { name: 'Confederation Park — North Burnaby', lat: 49.265, lng: -123.025, lengthMeters: 5000 },
  { name: 'SFU — Burnaby Mountain', lat: 49.278, lng: -122.919, lengthMeters: 6000 },
  { name: 'Port Moody — Rocky Point', lat: 49.274, lng: -122.853, lengthMeters: 5000 },
  { name: 'Coquitlam — Town Centre', lat: 49.283, lng: -122.793, lengthMeters: 5000 },
  { name: 'Mundy Park — Coquitlam', lat: 49.257, lng: -122.825, lengthMeters: 8000 },
  { name: 'Lafarge Lake — Town Centre', lat: 49.286, lng: -122.793, lengthMeters: 5000 },
  { name: 'New Westminster — Quay', lat: 49.201, lng: -122.912, lengthMeters: 5000 },
  { name: 'Queens Park — New West', lat: 49.214, lng: -122.906, lengthMeters: 4000 },
  { name: 'Richmond — Steveston Village', lat: 49.124, lng: -123.182, lengthMeters: 5000 },
  { name: 'Richmond — Olympic Oval', lat: 49.174, lng: -123.153, lengthMeters: 5000 },
  { name: 'Richmond — Minoru Park', lat: 49.166, lng: -123.138, lengthMeters: 4000 },
  { name: 'YVR — McDonald Beach', lat: 49.195, lng: -123.181, lengthMeters: 5000 },
  { name: 'UBC — Main Mall', lat: 49.261, lng: -123.246, lengthMeters: 6000 },
  { name: 'Pacific Spirit — 16th Entrance', lat: 49.258, lng: -123.228, lengthMeters: 8000 },
  { name: 'Spanish Banks — East', lat: 49.276, lng: -123.218, lengthMeters: 5000 },
  { name: 'Jericho Beach', lat: 49.272, lng: -123.198, lengthMeters: 5000 },
  { name: 'Point Grey — Jericho', lat: 49.269, lng: -123.185, lengthMeters: 5000 },
  { name: 'North Van — Lonsdale Quay', lat: 49.311, lng: -123.082, lengthMeters: 5000 },
  { name: 'North Van — Waterfront', lat: 49.315, lng: -123.079, lengthMeters: 5000 },
  { name: 'North Van — Mahon Park', lat: 49.324, lng: -123.072, lengthMeters: 5000 },
  { name: 'Capilano River — South', lat: 49.348, lng: -123.115, lengthMeters: 6000 },
  { name: 'Lynn Valley — Village', lat: 49.337, lng: -123.078, lengthMeters: 6000 },
  { name: 'West Van — Ambleside', lat: 49.328, lng: -123.158, lengthMeters: 5000 },
  { name: 'West Van — Dundarave', lat: 49.336, lng: -123.173, lengthMeters: 5000 },
  { name: 'Surrey — Bear Creek Park', lat: 49.136, lng: -122.857, lengthMeters: 8000 },
  { name: 'Surrey — Green Timbers', lat: 49.165, lng: -122.823, lengthMeters: 6000 },
  { name: 'Surrey — Holland Park', lat: 49.189, lng: -122.804, lengthMeters: 5000 },
  { name: 'White Rock — Promenade', lat: 49.024, lng: -122.803, lengthMeters: 5000 },
  { name: 'Delta — Boundary Bay', lat: 49.06, lng: -123.028, lengthMeters: 8000 },
  { name: 'Pitt Meadows — Osprey', lat: 49.233, lng: -122.688, lengthMeters: 6000 },
  { name: 'Maple Ridge — Kanaka Creek', lat: 49.214, lng: -122.593, lengthMeters: 6000 },
  // Toronto / Montreal anchors (far from YVR; good for travelers)
  { name: 'High Park — Grenadier Pond', lat: 43.646, lng: -79.463, lengthMeters: 5000 },
  { name: 'Toronto — Waterfront East', lat: 43.643, lng: -79.375, lengthMeters: 5000 },
  { name: 'Mount Royal — Peel Entrance', lat: 45.514, lng: -73.587, lengthMeters: 6000 },
  { name: 'Montreal — Old Port', lat: 45.508, lng: -73.554, lengthMeters: 5000 },
];

/**
 * Curated hotspots only (no synthetic grid). Caps at maxCount.
 */
export function buildHotspotList(maxCount: number): Hotspot[] {
  const seen = new Set<string>();
  const out: Hotspot[] = [];

  for (const h of CURATED_HOTSPOTS) {
    if (out.length >= maxCount) break;
    if (seen.has(h.name)) continue;
    seen.add(h.name);
    out.push(h);
  }

  return out;
}
