import type { Character, Player } from "./types";

/**
 * Roster seeded from Ant's dictated notes and the Notion player dashboards.
 * Re-run `npm run seed` after editing; it updates details and maximums but never resets slot usage.
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

/** [hit points, willpower, armour] */
type Slots = [number, number, number];

/** Used where the real numbers haven't been supplied yet. Set the real ones in the admin view. */
const TBC: Slots = [6, 6, 3];

let sortCounter = 0;

function c(
  player_id: string,
  name: string,
  opts: {
    main: boolean;
    campaign?: string;
    description?: string;
    era?: string;
    slots?: Slots;
  },
): Character {
  const [hp, wp, ar] = opts.slots ?? TBC;
  const campaign = opts.campaign ?? "";
  return {
    id: name.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    player_id,
    name,
    description: opts.description ?? "",
    era: opts.era ?? "",
    campaign,
    current: campaign === "Campaign 2" || campaign === "Campaign 3",
    is_main: opts.main,
    sort: ++sortCounter,
    hp_max: hp,
    hp_used: 0,
    wp_max: wp,
    wp_used: 0,
    ar_max: ar,
    ar_used: 0,
  };
}

const JAMES = "james-allen";
const JAKE = "jake-cawthray";
const JOSH = "josh-huntley";
const MATT = "matthew-fox";
const NAOISE = "naoise-oshea";
const WILDE = "wilde-wathne";

export const SEED_CHARACTERS: Character[] = [
  // James
  c(JAMES, "Fenrir", { main: true, campaign: "Campaign 2", description: "A Pooba Jedi Knight", era: "Active in 140 BBY", slots: [8, 6, 0] }),
  c(JAMES, "Tholo Endin", { main: true, campaign: "Campaign 3", description: "An enigmatic Ikkrukkian Force wielder", era: "Active in 7 ABY", slots: [6, 6, 3] }), // may be out of date after levelling
  c(JAMES, "Ji-Toh Codox", { main: true, campaign: "Nexu Crew", description: "A Cerean Jedi Survivor", era: "Active in 13 BBY" }),
  c(JAMES, "Sebastian Quickfin", { main: false, campaign: "Starfall", description: "A Tynann Rebellion agent", era: "Active in 3 ABY" }),
  c(JAMES, "Tim", { main: false, campaign: "Quest of the Jedi", description: "A normal, Human man", era: "Active in 382 BBY" }),
  c(JAMES, "Eisor Trius", { main: false, campaign: "Ride the Storm", description: "An Iktotchi Nihil marauder", era: "Active in 231 BBY" }),
  c(JAMES, "Pamlian Roleb", { main: false, campaign: "Train Heist", description: "A lawless Lasat on Coruscant", era: "Active in 16 BBY" }),
  c(JAMES, "Vomdeck Vus", { main: false, campaign: "Several", description: "A legendary Lasat war hero", era: "Active in 13 BBY" }),

  // Jake
  c(JAKE, "Bowen Clandis", { main: true, campaign: "Campaign 2", slots: [7, 7, 0] }),
  c(JAKE, "Bromtek Raag", { main: true, campaign: "Campaign 3", slots: [6, 6, 3] }),
  c(JAKE, "Vezulok Khargon", { main: true }),
  c(JAKE, "Zooq", { main: true }),
  c(JAKE, "Bolsa Roodah", { main: false, campaign: "Campaign 2", slots: [7, 7, 5] }),
  c(JAKE, "Rayzer Botch", { main: false }),

  // Josh
  c(JOSH, "Gadge Millet", { main: true, campaign: "Campaign 2", description: "Ikkrukian", slots: [6, 6, 3] }),
  c(JOSH, "Fubbo", { main: true, campaign: "Campaign 3", description: "Wookiee", slots: [7, 6, 4] }),
  c(JOSH, "Bingus K’aar", { main: true, campaign: "Nexu Crew", description: "Tusken" }),
  c(JOSH, "Agen Ankor", { main: false, campaign: "Quest of the Jedi", description: "Zabrack" }),
  c(JOSH, "Battarux", { main: false, campaign: "Ride the Storm", description: "Dashade" }),
  c(JOSH, "Rosama Melmi", { main: false, campaign: "Underworld Train Heist", description: "Human" }),

  // Matthew
  c(MATT, "Ras Mithra", { main: true, campaign: "Campaign 2", description: "Pkorian", slots: [7, 8, 0] }),
  c(MATT, "ECCO", { main: true, campaign: "Campaign 3", description: "Human", slots: [6, 6, 3] }),
  c(MATT, "Tabitha Topaz", { main: true, campaign: "Nexu Crew", description: "Human" }),
  c(MATT, "Tristan Topaz", { main: true, campaign: "Nexu Crew", description: "Human" }),
  c(MATT, "Kainard Plusttr", { main: false, campaign: "Quest of the Jedi", description: "Besalisk" }),
  c(MATT, "Kael", { main: false, campaign: "Ride the Storm", description: "Mon Calamari" }),
  c(MATT, "Vesh Caldrin", { main: false, campaign: "Rancor Heist", description: "Kage" }),
  c(MATT, "Barbossa", { main: false, campaign: "Underworld Train Heist", description: "Chironian" }),
  c(MATT, "Errol Reza", { main: false, campaign: "Nexu Crew", description: "Kalleran" }),
  c(MATT, "Biz Ube Hurley", { main: false, campaign: "Grakkus Arena", description: "Bith" }),

  // Naoise
  c(NAOISE, "L1-M3", { main: true, campaign: "Campaign 2", description: "Class 2 Droid", slots: [7, 6, 0] }),
  c(NAOISE, "Thalen Skellig", { main: true, campaign: "Campaign 3", description: "Human", slots: [7, 6, 4] }),
  c(NAOISE, "Dago Lomek", { main: true, campaign: "Nexu Crew", description: "Rodian" }),
  c(NAOISE, "Tommy Gleb", { main: false, campaign: "Quest of the Jedi", description: "Besalisk" }),
  c(NAOISE, "Viya Grah", { main: false, campaign: "Ride the Storm", description: "Nautolan" }),
  c(NAOISE, "BNT-333", { main: false, campaign: "Nexu Crew", description: "Seeker Droid" }),

  // Wilde
  c(WILDE, "A13-XA", { main: true, campaign: "Campaign 2", slots: [7, 6, 3] }),
  c(WILDE, "Rue Dahlia", { main: true, campaign: "Campaign 3", slots: [6, 6, 3] }),
  c(WILDE, "Sol’ina", { main: true }),
  c(WILDE, "Dia Tarkona", { main: false }),

  // Guests
  c("jack-pedleham", "Gary Woodland", { main: true, campaign: "Nexu Crew", description: "Tiss’shar" }),
  c("ryan-scott", "Gan Acka", { main: true, campaign: "Nexu Crew", description: "Anzellan" }),
];
