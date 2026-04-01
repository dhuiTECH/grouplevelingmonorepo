export type HairCreatorSwatch = {
  id: string;
  label: string;
  hex: string;
};

/** Eight preset hair colors for avatar labs (light → dark-ish, fantasy hues grouped). */
export const HAIR_CREATOR_SWATCHES: HairCreatorSwatch[] = [
  { id: "white", label: "White", hex: "#F5F5F5" },
  { id: "blonde", label: "Blonde", hex: "#FDF08A" },
  { id: "pink", label: "Pink", hex: "#E91E8C" },
  { id: "red", label: "Red", hex: "#B71C1C" },
  { id: "blue", label: "Blue", hex: "#1565C0" },
  { id: "purple", label: "Purple", hex: "#6A1B9A" },
  { id: "brown", label: "Brown", hex: "#5D4037" },
  { id: "black", label: "Black", hex: "#212121" },
];

/** Default when no profile value exists yet. */
export const DEFAULT_HAIR_TINT_HEX = "#5D4037";
