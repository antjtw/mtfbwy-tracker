import type { PathBuild } from "./types";

export interface Build {
  species: string;
  origin: string;
  career: string;
  paths: PathBuild[];
}

/**
 * Each Hero's species, origin, Path(s) with Archetype levels, and career, keyed by character id.
 * From Ant's builds spreadsheet. Blank where a character has no build recorded yet.
 */
export const BUILDS: Record<string, Build> = {
  "gary-woodland": { species: "Tiss’shar", origin: "Prospect", career: "Bounty Hunter", paths: [{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 9 }] }] },
  "bolsa-roodah": { species: "Rodian", origin: "Abandoned", career: "Smuggler", paths: [{ path: "Technologist", archetypes: [{ name: "Artillerist", level: 4 }] }] },
  "bowen-clandis": { species: "Pantoran", origin: "Jedi Initiate", career: "Force Scholar", paths: [{ path: "Devout", archetypes: [{ name: "Guardian", level: 4 }] }] },
  "bromtek-raag": { species: "Aqualish", origin: "Survivor", career: "Freedom Fighter", paths: [{ path: "Marauder", archetypes: [{ name: "Berserker", level: 3 }] }] },
  "wee-dunga-funq": { species: "Rodian", origin: "Tribal", career: "Bounty Hunter", paths: [{ path: "Wayfarer", archetypes: [{ name: "Gunslinger", level: 4 }] }] },
  "terri-zooq": { species: "Gand", origin: "Hardened", career: "Bounty Hunter", paths: [{ path: "Marauder", archetypes: [{ name: "Berserker", level: 9 }] }] },
  "ulon-glost": { species: "Mustafarian", origin: "", career: "", paths: [] },
  "vezulok-khargon": { species: "Barabel", origin: "Prospect", career: "Scholar", paths: [{ path: "Technologist", archetypes: [{ name: "Safety Net", level: 8 }] },{ path: "Marauder", archetypes: [{ name: "Berserker", level: 1 }] }] },
  "bezulok-fhargon": { species: "Barabel", origin: "", career: "", paths: [] },
  "orrin-vox": { species: "Bith", origin: "Everyman", career: "Freedom Fighter", paths: [{ path: "Technologist", archetypes: [{ name: "Artillerist", level: 10 }] }] },
  "cors-ghrenald": { species: "Human", origin: "", career: "", paths: [] },
  "rayzer-botch": { species: "Tynann", origin: "Addict", career: "Smuggler", paths: [{ path: "Technologist", archetypes: [{ name: "Safety Net", level: 3 }] }] },
  "korpel-yurik": { species: "Anomid", origin: "", career: "", paths: [] },
  "fenrir": { species: "Pooba", origin: "Jedi Initiate", career: "Jedi Knight", paths: [{ path: "Sentinel", archetypes: [{ name: "Blademaster", level: 4 }] }] },
  "tholo-endin": { species: "Ikkrukkian", origin: "Abandoned", career: "Smuggler", paths: [{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 3 }] }] },
  "kirk-dickson": { species: "Human", origin: "Tribal", career: "Freedom Fighter", paths: [{ path: "Marauder", archetypes: [{ name: "Tank", level: 4 }] }] },
  "ji-toh-codox": { species: "Cerean", origin: "Jedi Initiate", career: "Jedi Outcast", paths: [{ path: "Sentinel", archetypes: [{ name: "Blademaster", level: 9 }] }] },
  "tim": { species: "Human", origin: "", career: "", paths: [] },
  "ashira-taal": { species: "Twi’lek", origin: "Force Sensitive", career: "Slicer", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 8 }] },{ path: "Sentinel", archetypes: [{ name: "Shadowblade", level: 2 }] }] },
  "eisor-trius": { species: "Iktotchi", origin: "", career: "", paths: [] },
  "sebastian-quickfin": { species: "Tynann", origin: "Tribal", career: "Ambassador", paths: [{ path: "Devout", archetypes: [{ name: "Guardian", level: 3 }] }] },
  "vomdek-vus": { species: "Lasat", origin: "", career: "", paths: [] },
  "pamlian-roleb": { species: "Lasat", origin: "", career: "", paths: [] },
  "gadge-millet": { species: "Ikkrukkian", origin: "Force Sensitive", career: "Bounty Hunter", paths: [{ path: "Sentinel", archetypes: [{ name: "Striker", level: 4 }] }] },
  "fubbo": { species: "Wookiee", origin: "Tribal", career: "Freedom Fighter", paths: [{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 3 }] }] },
  "rodneh-cheekoo": { species: "Rodian", origin: "Force Sensitive", career: "Jedi Knight", paths: [{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 4 }] }] },
  "bingus-kaar": { species: "Tusken", origin: "Tribal", career: "", paths: [{ path: "Technologist", archetypes: [{ name: "Polestar", level: 7 }] },{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 2 }] }] },
  "agen-ankor": { species: "Zebrak", origin: "", career: "", paths: [] },
  "drassk-the-endurer": { species: "Trandoshan", origin: "Survivor", career: "Gladiator", paths: [{ path: "Marauder", archetypes: [{ name: "Ravager", level: 10 }] }] },
  "battarux": { species: "Dashade", origin: "", career: "", paths: [] },
  "rosama-melmi": { species: "Human", origin: "", career: "", paths: [] },
  "ras-mithra": { species: "Pkorian", origin: "Jedi Initiate", career: "Jedi Knight", paths: [{ path: "Sorcerer", archetypes: [{ name: "Embalmed", level: 4 }] }] },
  "ecco": { species: "Human", origin: "Hardened", career: "Droidsmith", paths: [{ path: "Technologist", archetypes: [{ name: "Safety Net", level: 3 }] }] },
  "biz-ube-hurley": { species: "Bith", origin: "Abandoned", career: "Freedom Fighter", paths: [{ path: "Devout", archetypes: [{ name: "Guardian", level: 4 }] }] },
  "errol-reza": { species: "Kalleran", origin: "", career: "", paths: [] },
  "tabitha-topaz": { species: "Human", origin: "Force Sensitive", career: "Freedom Fighter", paths: [{ path: "Sentinel", archetypes: [{ name: "Blademaster", level: 9 }] }] },
  "tristan-topaz": { species: "Human", origin: "Force Sensitive", career: "Engineer", paths: [{ path: "Technologist", archetypes: [{ name: "Artillerist", level: 9 }] }] },
  "vesh-caldrin": { species: "Kage", origin: "Prospect", career: "Assassin", paths: [{ path: "Devout", archetypes: [{ name: "Crusader", level: 10 }] }] },
  "kael": { species: "Mon Calamari", origin: "", career: "", paths: [] },
  "kainard-plusttr": { species: "Besalisk", origin: "Exile", career: "Pathfinder", paths: [{ path: "Marauder", archetypes: [{ name: "Tank", level: 3 }] }] },
  "barbossa": { species: "Chironian", origin: "", career: "", paths: [] },
  "l1-m3": { species: "Second Class Droid", origin: "Abandoned", career: "DJ", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 4 }] }] },
  "thalen-skellig": { species: "Human", origin: "Jedi Initiate", career: "Force Scholar", paths: [{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 3 }] }] },
  "dago-lomek": { species: "Rodian", origin: "Hardened", career: "Pilot", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 9 }] }] },
  "tommy-gleb": { species: "Besalisk", origin: "", career: "", paths: [] },
  "viya-grah": { species: "Nautolan", origin: "", career: "", paths: [] },
  "gan-acka": { species: "Anzellan", origin: "Addict", career: "Engineer", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 9 }] }] },
  "a13-xa": { species: "Third Class Droid", origin: "Abandoned", career: "Pilot", paths: [{ path: "Technologist", archetypes: [{ name: "Polestar", level: 4 }] }] },
  "rue-dahlia": { species: "Human", origin: "Hardened", career: "Scholar", paths: [{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 3 }] }] },
  "solina": { species: "Togorian", origin: "Hardened", career: "Freedom Fighter", paths: [{ path: "Wayfarer", archetypes: [{ name: "Gunslinger", level: 9 }] }] },
  "tantoori-vozo": { species: "Nikto", origin: "", career: "", paths: [] },
  "mark-mantis": { species: "Gand", origin: "", career: "", paths: [] },
  "lucky-calder": { species: "Human", origin: "Optimist", career: "Crime Lord", paths: [{ path: "Wayfarer", archetypes: [{ name: "Gambler", level: 10 }] }] },
  "dia-tarkdona": { species: "Twi’lek", origin: "Hardened", career: "Pathfinder", paths: [{ path: "Marauder", archetypes: [{ name: "Zealot", level: 3 }] }] },
  "kaja-vel": { species: "Kiffar", origin: "", career: "", paths: [] },
};

export const NO_BUILD: Build = { species: "", origin: "", career: "", paths: [] };
