import type { Character, Player } from "./types";

/**
 * Placeholder seed taken from the Figma designs. Replace with the real roster
 * (players, characters, campaigns, starting maximums) and re-run `npm run seed`.
 */
export const SEED_PLAYERS: Player[] = [
  { id: "james-allen", name: "James Allen", is_guest: false, status: "active", sort: 1 },
  { id: "jake-cawthray", name: "Jake Cawthray", is_guest: false, status: "active", sort: 2 },
  { id: "josh-huntley", name: "Josh Huntley", is_guest: false, status: "active", sort: 3 },
  { id: "matthew-fox", name: "Matthew Fox", is_guest: false, status: "active", sort: 4 },
  { id: "naoise-oshea", name: "Naoise O’Shea", is_guest: false, status: "partial", sort: 5 },
  { id: "wilde-wathne", name: "Wilde Wathne", is_guest: false, status: "active", sort: 6 },
  { id: "jack-pedleham", name: "Jack Pedleham", is_guest: true, status: "inactive", sort: 7 },
  { id: "ryan-scott", name: "Ryan Scott", is_guest: true, status: "inactive", sort: 8 },
];

type C = Omit<Character, "hp_used" | "wp_used" | "ar_used" | "hp_max" | "wp_max" | "ar_max"> &
  Partial<Pick<Character, "hp_max" | "wp_max" | "ar_max">>;

const c = (
  id: string,
  player_id: string,
  name: string,
  description: string,
  era: string,
  campaign: string,
  is_main: boolean,
  sort: number,
  current = false,
): C => ({ id, player_id, name, description, era, campaign, is_main, sort, current });

const RAW: C[] = [
  c("fenrir", "james-allen", "Fenrir", "A Pooba Jedi Knight", "Active in 140 BBY", "Campaign 2", true, 1, true),
  c("ji-toh-codox", "james-allen", "Ji-Toh Codox", "A Cerean Jedi Survivor", "Active in 13 BBY", "Nexu Crew", true, 2),
  c("sebastian-quickfin", "james-allen", "Sebastian Quickfin", "A Tynann Rebellion agent", "Active in 3 ABY", "Starfall", true, 3),
  c("tholo-endin", "james-allen", "Tholo Endin", "An enigmatic Ikkrukkian Force wielder", "Active in 7 ABY", "Campaign 3", true, 4, true),
  c("tim", "james-allen", "Tim", "A normal, Human man", "Active in 382 BBY", "Quest of the Jedi", false, 5),
  c("eisor-trius", "james-allen", "Eisor Trius", "An Iktotchi Nihil marauder", "Active in 231 BBY", "Ride the Storm", false, 6),
  c("pamlian-roleb", "james-allen", "Pamlian Roleb", "A lawless Lasat on Coruscant", "Active in 16 BBY", "Train Heist", false, 7),
  c("vomdeck-vus", "james-allen", "Vomdeck Vus", "A legendary Lasat war hero", "Active in 13 BBY", "Several", false, 8),
  // Placeholders for the remaining players, swap for real data
  c("vezulok-khargon", "jake-cawthray", "Vezulok Khargon", "", "", "Campaign 2", true, 1, true),
  c("zooq", "jake-cawthray", "Zooq", "", "", "Nexu Crew", true, 2),
  c("bingus-kaar", "josh-huntley", "Bingus K’aar", "", "", "Campaign 2", true, 1, true),
  c("tristan-and-tabitha-topaz", "matthew-fox", "Tristan and Tabitha Topaz", "", "", "Campaign 2", true, 1, true),
  c("dago-lomek", "naoise-oshea", "Dago Lomek", "", "", "Campaign 2", true, 1, true),
  c("solina", "wilde-wathne", "Sol’ina", "", "", "Campaign 2", true, 1, true),
  c("gary-woodland", "jack-pedleham", "Gary Woodland", "", "", "Several", false, 1),
  c("gan-acka", "ryan-scott", "Gan Acka", "", "", "Several", false, 1),
];

export const SEED_CHARACTERS: Character[] = RAW.map((r) => ({
  hp_max: 7,
  wp_max: 7,
  ar_max: 4,
  ...r,
  hp_used: 0,
  wp_used: 0,
  ar_used: 0,
}));
