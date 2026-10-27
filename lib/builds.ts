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
  "ulon-glost": { species: "Mustafarian", origin: "", career: "Pod Racer", paths: [] },
  "vezulok-khargon": { species: "Barabel", origin: "Prospect", career: "Scholar", paths: [{ path: "Vanguard", archetypes: [{ name: "Academic", level: 7 }] },{ path: "Marauder", archetypes: [{ name: "Berserker", level: 2 }] }] },
  "bezulok-fhargon": { species: "Barabel", origin: "Optimist", career: "Pathfinder", paths: [{ path: "Vanguard", archetypes: [{ name: "Envoy", level: 2 }] }] },
  "orrin-vox": { species: "Bith", origin: "Everyman", career: "Freedom Fighter", paths: [{ path: "Technologist", archetypes: [{ name: "Artillerist", level: 10 }] }] },
  "cors-ghrenald": { species: "Human (Coruscanti)", origin: "Hardened", career: "Nihil Cloud Enforcer", paths: [{ path: "Technologist", archetypes: [{ name: "Artillerist", level: 2 }] }] },
  "rayzer-botch": { species: "Tynann", origin: "Addict", career: "Smuggler", paths: [{ path: "Technologist", archetypes: [{ name: "Safety Net", level: 3 }] }] },
  "korpel-yurik": { species: "Anomid", origin: "", career: "Droidsmith", paths: [] },
  "fenrir": { species: "Pooba", origin: "Jedi Initiate", career: "Jedi Knight", paths: [{ path: "Sentinel", archetypes: [{ name: "Blademaster", level: 4 }] }] },
  "tholo-endin": { species: "Ikkrukkian", origin: "Abandoned", career: "Smuggler", paths: [{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 3 }] }] },
  "kirk-dickson": { species: "Human", origin: "Tribal", career: "Freedom Fighter", paths: [{ path: "Marauder", archetypes: [{ name: "Tank", level: 4 }] }] },
  "ji-toh-codox": { species: "Cerean", origin: "Jedi Initiate", career: "Jedi Outcast", paths: [{ path: "Sentinel", archetypes: [{ name: "Blademaster", level: 9 }] }] },
  "tim": { species: "Human", origin: "Everyman", career: "Pathfinder", paths: [{ path: "Wayfarer", archetypes: [{ name: "Gambler", level: 2 }] }] },
  "ashira-taal": { species: "Twi’lek", origin: "Force Sensitive", career: "Slicer", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 8 }] },{ path: "Sentinel", archetypes: [{ name: "Shadowblade", level: 2 }] }] },
  "eisor-trius": { species: "Iktotchi", origin: "Force Sensitive", career: "Nihil Cloud Enforcer", paths: [{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 2 }] }] },
  "sebastian-quickfin": { species: "Tynann", origin: "Tribal", career: "Ambassador", paths: [{ path: "Devout", archetypes: [{ name: "Guardian", level: 3 }] }] },
  "vomdek-vus": { species: "Lasat", origin: "Everyman", career: "Freedom Fighter", paths: [{ path: "Wayfarer", archetypes: [{ name: "Gunslinger", level: 3 }] }] },
  "pamlian-roleb": { species: "Lasat", origin: "", career: "Labourer", paths: [] },
  "gadge-millet": { species: "Ikkrukkian", origin: "Force Sensitive", career: "Bounty Hunter", paths: [{ path: "Sentinel", archetypes: [{ name: "Striker", level: 4 }] }] },
  "fubbo": { species: "Wookiee", origin: "Tribal", career: "Freedom Fighter", paths: [{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 3 }] }] },
  "rodneh-cheekoo": { species: "Rodian", origin: "Force Sensitive", career: "Jedi Knight", paths: [{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 4 }] }] },
  "bingus-kaar": { species: "Tusken", origin: "Tribal", career: "Labourer", paths: [{ path: "Technologist", archetypes: [{ name: "Polestar", level: 6 }] },{ path: "Vanguard", archetypes: [{ name: "Spearhead", level: 2 }] },{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 1 }] }] },
  "agen-ankor": { species: "Zebrak", origin: "Jedi Initiate", career: "Jedi Knight", paths: [{ path: "Sentinel", archetypes: [{ name: "Blademaster", level: 2 }] }] },
  "drassk-the-endurer": { species: "Trandoshan", origin: "Survivor", career: "Gladiator", paths: [{ path: "Marauder", archetypes: [{ name: "Ravager", level: 10 }] }] },
  "battarux": { species: "Dashade", origin: "Prospect", career: "Nihil Cloud Enforcer", paths: [{ path: "Vanguard", archetypes: [{ name: "Spearhead", level: 2 }] }] },
  "rosama-melmi": { species: "Human", origin: "", career: "DJ", paths: [] },
  "ras-mithra": { species: "Pkorian", origin: "Jedi Initiate", career: "Jedi Knight", paths: [{ path: "Sorcerer", archetypes: [{ name: "Embalmed", level: 4 }] }] },
  "ecco": { species: "Human", origin: "Hardened", career: "Droidsmith", paths: [{ path: "Technologist", archetypes: [{ name: "Safety Net", level: 3 }] }] },
  "biz-ube-hurley": { species: "Bith", origin: "Abandoned", career: "Freedom Fighter", paths: [{ path: "Devout", archetypes: [{ name: "Guardian", level: 4 }] }] },
  "errol-reza": { species: "Kalleran", origin: "", career: "Pod Racer", paths: [] },
  "tabitha-topaz": { species: "Human", origin: "Force Sensitive", career: "Freedom Fighter", paths: [{ path: "Sentinel", archetypes: [{ name: "Blademaster", level: 9 }] }] },
  "tristan-topaz": { species: "Human", origin: "Force Sensitive", career: "Engineer", paths: [{ path: "Technologist", archetypes: [{ name: "Artillerist", level: 9 }] }] },
  "vesh-caldrin": { species: "Kage", origin: "Prospect", career: "Assassin", paths: [{ path: "Devout", archetypes: [{ name: "Crusader", level: 10 }] }] },
  "kael": { species: "Mon Calamari", origin: "Prospect", career: "Nihil Cloud Enforcer", paths: [{ path: "Devout", archetypes: [{ name: "Guardian", level: 2 }] }] },
  "kainard-plusttr": { species: "Besalisk", origin: "Exile", career: "Pathfinder", paths: [{ path: "Marauder", archetypes: [{ name: "Tank", level: 3 }] }] },
  "barbossa": { species: "Chironian", origin: "", career: "Meknek", paths: [] },
  "l1-m3": { species: "Second Class Droid", origin: "Abandoned", career: "DJ", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 4 }] }] },
  "thalen-skellig": { species: "Human", origin: "Jedi Initiate", career: "Force Scholar", paths: [{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 3 }] }] },
  "dago-lomek": { species: "Rodian", origin: "Hardened", career: "Pilot", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 9 }] }] },
  "tommy-gleb": { species: "Besalisk", origin: "Prospect", career: "Pilot", paths: [{ path: "Wayfarer", archetypes: [{ name: "Voyager", level: 2 }] }] },
  "viya-grah": { species: "Nautolan", origin: "Hardened", career: "Nihil Cloud Enforcer", paths: [{ path: "Marauder", archetypes: [{ name: "Berserker", level: 2 }] }] },
  "gan-acka": { species: "Anzellan", origin: "Addict", career: "Engineer", paths: [{ path: "Technologist", archetypes: [{ name: "Skeleton Key", level: 9 }] }] },
  "a13-xa": { species: "Third Class Droid", origin: "Abandoned", career: "Pilot", paths: [{ path: "Technologist", archetypes: [{ name: "Polestar", level: 4 }] }] },
  "rue-dahlia": { species: "Human", origin: "Hardened", career: "Scholar", paths: [{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 3 }] }] },
  "solina": { species: "Togorian", origin: "Hardened", career: "Freedom Fighter", paths: [{ path: "Wayfarer", archetypes: [{ name: "Gunslinger", level: 9 }] }] },
  "tantoori-vozo": { species: "Nikto", origin: "", career: "Pod Racer", paths: [] },
  "mark-mantis": { species: "Gand", origin: "Hardened", career: "Pathfinder", paths: [{ path: "Wayfarer", archetypes: [{ name: "Operative", level: 2 }] }] },
  "lucky-calder": { species: "Human", origin: "Optimist", career: "Crime Lord", paths: [{ path: "Wayfarer", archetypes: [{ name: "Gambler", level: 10 }] }] },
  "dia-tarkdona": { species: "Twi’lek", origin: "Hardened", career: "Pathfinder", paths: [{ path: "Marauder", archetypes: [{ name: "Zealot", level: 3 }] }] },
  "kaja-vel": { species: "Kiffar", origin: "", career: "Engineer", paths: [] },
};

export const NO_BUILD: Build = { species: "", origin: "", career: "", paths: [] };
