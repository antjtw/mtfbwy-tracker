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
  /** Campaign or quest tag shown on the character row, also used to group in the admin view */
  campaign: string;
  /** Highlights the tag in gold (currently running campaigns) */
  current: boolean;
  /** Campaign character (true) or side character (false) */
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
