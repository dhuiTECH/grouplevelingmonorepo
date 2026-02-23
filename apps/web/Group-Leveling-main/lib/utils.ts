// Utility functions for the application

// Title rank mapping for skill requirements
const TITLE_RANK_MAP: Record<string, number> = {
  'Novice': 0,
  'Apprentice': 1,
  'Journeyman': 2,
  'Adept': 3,
  'Expert': 4,
  'Master': 5,
  'Grandmaster': 6,
  'Legend': 7,
  'Myth': 8,
  'Divine': 9
};

export function getTitleRank(title: string): number {
  return TITLE_RANK_MAP[title] || 0;
}

// Other utility functions can be added here as needed