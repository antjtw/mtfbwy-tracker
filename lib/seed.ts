import type { Character, Player } from "./types";

/**
 * Roster seeded from Ant's dictated notes and the Notion player dashboards.
 * Re-run `npm run seed` after editing; it updates details and maximums but never resets slot usage.
 */
export const SEED_PLAYERS: Player[] = [
  { id: "jake-cawthray", name: "Jake Cawthray", is_guest: false, status: "active", sort: 1 },
  { id: "james-allen", name: "James Allen", is_guest: false, status: "active", sort: 2 },
  { id: "josh-huntley", name: "Josh Huntley", is_guest: false, status: "active", sort: 3 },
  { id: "matthew-fox", name: "Matthew Fox", is_guest: false, status: "active", sort: 4 },
  { id: "naoise-oshea", name: "Naoise O’Shea", is_guest: false, status: "partial", sort: 5 },
  { id: "wilde-wathne", name: "Wilde Wathne", is_guest: false, status: "active", sort: 6 },
  { id: "jack-pedleham", name: "Jack Pedleham", is_guest: true, status: "inactive", sort: 7 },
  { id: "ryan-scott", name: "Ryan Scott", is_guest: true, status: "inactive", sort: 8 },
];

/** [hit points, willpower, armour] */
type Slots = [number, number, number];

/** Starting maximums where real numbers haven't been supplied. Adjust them in the GM view. */
const TBC: Slots = [6, 6, 0];

/** Characters in any of these adventures are main characters */
const MAIN_ADVENTURES = ["Campaign 2", "Campaign 3", "Starfall"];

const QOTJ = "Quest of the Jedi";
const RTS = "Ride the Storm";
const NEXU = "Nexu Crew";
const C2 = "Campaign 2";
const C3 = "Campaign 3";
const STAR = "Starfall";
const HEIST = "Underworld Train Heist";
const RANCOR = "Rancor Heist";
const ARENA = "Grakkus Arena";

let sortCounter = 0;

function c(
  player_id: string,
  name: string,
  opts: {
    adventures?: string[];
    /** Main if in a main adventure; set true/false to override (e.g. other Nexu Crew mains) */
    main?: boolean;
    description?: string;
    era?: string;
    slots?: Slots;
    /** Keeps the original database id (and tracker URL) when a character is renamed */
    id?: string;
  },
): Character {
  const [hp, wp, ar] = opts.slots ?? TBC;
  const adventures = opts.adventures ?? [];
  return {
    id: opts.id ?? name.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    player_id,
    name,
    description: opts.description ?? "",
    era: opts.era ?? "",
    adventures,
    tracked: true, // every character has a tracker; maximums are managed in the GM view
    is_main: opts.main ?? adventures.some((a) => MAIN_ADVENTURES.includes(a)),
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

const ROSTER: Character[] = [
  // James
  c(JAMES, "Fenrir", { adventures: [C2], description: "A Pooba Jedi Knight", era: "Active in 140 BBY", slots: [8, 6, 0] }),
  c(JAMES, "Tholo Endin", { adventures: [C3], description: "An enigmatic Ikkrukkian Force wielder", era: "Active in 7 ABY", slots: [6, 6, 3] }), // may be out of date after levelling
  c(JAMES, "Ji-Toh Codox", { adventures: [NEXU, C3], main: true, description: "A Cerean Jedi Survivor", era: "Active in 13 BBY" }),
  c(JAMES, "Sebastian Quickfin", { adventures: [STAR], description: "A Tynann Rebellion agent", era: "Active in 3 ABY" }),
  c(JAMES, "Vomdek Vus", { adventures: [STAR], description: "A legendary Lasat war hero", era: "Active in 13 BBY" }),
  c(JAMES, "Tim", { adventures: [QOTJ], description: "A normal, Human man", era: "Active in 382 BBY" }),
  c(JAMES, "Eisor Trius", { adventures: [RTS], description: "An Iktotchi Nihil marauder", era: "Active in 231 BBY" }),
  c(JAMES, "Ashira Taal", { adventures: [RANCOR], description: "Twi’lek" }),
  c(JAMES, "Kirk Dickson", { adventures: [ARENA], description: "Human" }),
  c(JAMES, "Pamliven Roleb", { id: "pamlian-roleb", adventures: [HEIST], description: "A lawless Lasat on Coruscant", era: "Active in 16 BBY" }),

  // Jake
  c(JAKE, "Bowen Clandis", { adventures: [C2], description: "Pantoran", slots: [7, 7, 0] }),
  c(JAKE, "Bromtek Raag", { adventures: [C3], description: "Aqualish", slots: [6, 6, 3] }),
  c(JAKE, "Teri Zooq", { id: "terri-zooq", adventures: [NEXU], main: true, description: "Gand" }),
  c(JAKE, "Vezulok Khargon", { adventures: [NEXU, C3], main: true, description: "Barabel" }),
  c(JAKE, "Rayzer Botch", { adventures: [STAR, C3], description: "Tynann" }),
  c(JAKE, "Bolsa Roodah", { adventures: [C2], main: false, description: "Rodian", slots: [7, 7, 5] }),
  c(JAKE, "Bezulok Fhargon", { adventures: [QOTJ], description: "Barabel" }),
  c(JAKE, "Cors 'Blitz' Ghrenald", { id: "cors-ghrenald", adventures: [RTS], description: "Human" }),
  c(JAKE, "Korpel Yurik", { adventures: [HEIST], description: "Anomid" }),
  c(JAKE, "Orrin Vox", { adventures: [RANCOR], description: "Bith" }),
  c(JAKE, "Wee Dunga Funq", { adventures: [ARENA], description: "Rodian" }),
  c(JAKE, "Ulon Glost", { adventures: [NEXU], description: "Mustafarian" }),

  // Josh
  c(JOSH, "Gadge Millet", { adventures: [C2], description: "Ikkrukian", slots: [6, 6, 3] }),
  c(JOSH, "Fubbroonfal", { id: "fubbo", adventures: [C3], description: "Wookiee", slots: [7, 6, 4] }),
  c(JOSH, "Bingus-K’aar", { id: "bingus-kaar", adventures: [NEXU], main: true, description: "Tusken" }),
  c(JOSH, "Agen Ankor", { adventures: [QOTJ], description: "Zebrak" }),
  c(JOSH, "Battarux", { adventures: [RTS], description: "Dashade" }),
  c(JOSH, "Drassk the Endurer", { adventures: [RANCOR], description: "Trandoshan" }),
  c(JOSH, "Rodneh Cheekoo", { adventures: [ARENA], description: "Rodian" }),
  c(JOSH, "Rosama Melmi", { adventures: [HEIST], description: "Human" }),

  // Matthew
  c(MATT, "Ras Mithra", { adventures: [C2], description: "Pkorian", slots: [7, 8, 0] }),
  c(MATT, "ECCO", { adventures: [C3], description: "Human", slots: [6, 6, 3] }),
  c(MATT, "Kainard Plusttr", { adventures: [STAR], description: "Besalisk" }),
  c(MATT, "Tabitha Topaz", { adventures: [NEXU, C3], main: true, description: "Human" }),
  c(MATT, "Tristan Topaz", { adventures: [NEXU, C3], main: true, description: "Human" }),
  c(MATT, "Kael", { adventures: [RTS], description: "Mon Calamari" }),
  c(MATT, "Vesh Caldrin", { adventures: [RANCOR], description: "Kage" }),
  c(MATT, "Barbossa", { adventures: [HEIST], description: "Chironian" }),
  c(MATT, "Errol Reza", { adventures: [NEXU], description: "Kalleran" }),
  c(MATT, "Biz Ube Hurley", { adventures: [ARENA], description: "Bith" }),

  // Naoise
  c(NAOISE, "L1-M3", { adventures: [C2, C3], description: "Class 2 Droid", slots: [7, 6, 0] }),
  c(NAOISE, "Thalen Skellig", { adventures: [C3], description: "Human", slots: [7, 6, 4] }),
  c(NAOISE, "Slakk Printall (Dago Lomek)", { id: "dago-lomek", adventures: [NEXU, C3], main: true, description: "Rodian" }),
  c(NAOISE, "Tommy Gleb", { adventures: [QOTJ], description: "Besalisk" }),
  c(NAOISE, "Viya Grah", { adventures: [RTS], description: "Nautolan" }),

  // Wilde
  c(WILDE, "A13-XA", { adventures: [C2], description: "Class 3 Droid", slots: [7, 6, 3] }),
  c(WILDE, "Rue Dahlia", { adventures: [C3], description: "Human", slots: [6, 6, 3] }),
  c(WILDE, "Dia Tarkona", { id: "dia-tarkdona", adventures: [STAR], description: "Twi’lek" }),
  c(WILDE, "Sol’ina", { adventures: [NEXU], main: true, description: "Togorian" }),
  c(WILDE, "Mark Mantis", { adventures: [QOTJ], description: "Gand" }),
  c(WILDE, "Lucky Calder", { adventures: [RANCOR], description: "Human" }),
  c(WILDE, "Kaja Verec", { id: "kaja-vel", adventures: [HEIST], description: "Kiffar" }),
  c(WILDE, "Tantoori Vozo", { adventures: [NEXU], description: "Nikto" }),

  // Guests
  c("jack-pedleham", "Gary Woodland", { adventures: [NEXU, C3], main: true, description: "Tiss’shar" }),
  c("ryan-scott", "Gan Acka", { adventures: [NEXU], main: true, description: "Anzellan" }),
];

/**
 * Display order per player, following the Notion dashboards (roughly each character's timeline).
 * Bolsa Roodah is new and isn't on the dashboards yet, so he sits next to Bowen (Campaign 2).
 */
const TIMELINE: Record<string, string[]> = {
  "james-allen": ["Tim", "Eisor Trius", "Fenrir", "Ashira Taal", "Ji-Toh Codox", "Tholo Endin", "Pamliven Roleb", "Vomdek Vus", "Kirk Dickson", "Sebastian Quickfin"],
  "jake-cawthray": ["Bezulok Fhargon", "Cors 'Blitz' Ghrenald", "Bowen Clandis", "Bolsa Roodah", "Orrin Vox", "Bromtek Raag", "Teri Zooq", "Vezulok Khargon", "Korpel Yurik", "Ulon Glost", "Wee Dunga Funq", "Rayzer Botch"],
  "josh-huntley": ["Agen Ankor", "Battarux", "Gadge Millet", "Drassk the Endurer", "Fubbroonfal", "Bingus-K’aar", "Rosama Melmi", "Rodneh Cheekoo"],
  "matthew-fox": ["Kainard Plusttr", "Kael", "Ras Mithra", "Vesh Caldrin", "Tabitha Topaz", "Tristan Topaz", "Barbossa", "Errol Reza", "Biz Ube Hurley", "ECCO"],
  "naoise-oshea": ["Tommy Gleb", "L1-M3", "Viya Grah", "Slakk Printall (Dago Lomek)", "Thalen Skellig"],
  "wilde-wathne": ["Mark Mantis", "A13-XA", "Lucky Calder", "Sol’ina", "Rue Dahlia", "Dia Tarkona", "Kaja Verec", "Tantoori Vozo"],
  "jack-pedleham": ["Gary Woodland"],
  "ryan-scott": ["Gan Acka"],
};

/** Global sort = player position * 100 + position in that player's timeline. */
export const SEED_CHARACTERS: Character[] = ROSTER.map((c) => {
  const pi = SEED_PLAYERS.findIndex((p) => p.id === c.player_id);
  const ti = TIMELINE[c.player_id]?.indexOf(c.name) ?? -1;
  if (pi < 0 || ti < 0) throw new Error(`${c.name} is missing from TIMELINE`);
  return { ...c, sort: (pi + 1) * 100 + ti };
}).sort((a, b) => a.sort - b.sort);
