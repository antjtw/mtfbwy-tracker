export type PlayerStatus = "active" | "partial" | "inactive";

export interface Player {
  id: string;
  name: string;
  is_guest: boolean;
  status: PlayerStatus;
  sort: number;
}

export interface Character {
  id: string;
  player_id: string;
  name: string;
  description: string;
  era: string;
  /**
   * Every adventure the character appears in. They show under each one (player list and admin
   * filters) but share a single set of slots, so usage carries across adventures.
   */
  adventures: string[];
  /** Has a tracker switched on. Only Campaign 2 and 3 characters for now; the rest are listed but not linked. */
  tracked: boolean;
  /** Main character (true) or side character (false) */
  is_main: boolean;
  sort: number;
  hp_max: number;
  hp_used: number;
  wp_max: number;
  wp_used: number;
  ar_max: number;
  ar_used: number;
}

export const MAX_SLOTS = 12;

/** Adventures shown with a gold tag */
export const CURRENT_ADVENTURES = ["Campaign 2", "Campaign 3"];

export const TRACKS = [
  { key: "hp", label: "Hit point slots", blurb: "Your physical health, toughness and vitality" },
  { key: "wp", label: "Willpower slots", blurb: "Your mental toughness, mana, determination" },
  { key: "ar", label: "Armour slots", blurb: "Determined by your armour score, provides protection" },
] as const;

export type TrackKey = (typeof TRACKS)[number]["key"];

/** Fields a client may patch, e.g. "hp_used" */
export type CharacterPatch = Partial<
  Pick<Character, "hp_used" | "hp_max" | "wp_used" | "wp_max" | "ar_used" | "ar_max">
>;
