import { PATH_BY_ID, SPECIES_BY_ID } from "./data";
import { computeHero } from "./engine";
import type { Character, PathBuild } from "../types";
import { describeBuild } from "../build";
import { CAREER_BY_ID, ORIGIN_BY_ID } from "./data";
import type { Hero } from "./types";

const slug = (n: string) => n.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function buildOf(hero: Hero) {
  const d = computeHero(hero);
  const species = SPECIES_BY_ID[hero.species.id];
  const sub = species?.subspecies?.find((s) => s.id === hero.species.subspeciesId);
  const paths: PathBuild[] = d.paths.map((p) => {
    const def = PATH_BY_ID[p.pathId];
    return {
      path: def?.name ?? p.pathId,
      archetypes: p.archetypes.map((a) => ({ name: def?.archetypes.find((x) => x.id === a.archetypeId)?.name ?? a.archetypeId, level: a.level })),
    };
  });
  const build = {
    species: sub && species?.subspeciesLabel === "Ancestral origin" ? `${species.name} (${sub.name})` : species?.name ?? "",
    origin: ORIGIN_BY_ID[hero.origin.id]?.name ?? "",
    career: CAREER_BY_ID[hero.career.id]?.name ?? "",
    paths,
  };
  return { d, build };
}

/** What changes on a character's tracker record when its Hero is edited. Slot usage is kept (trimmed to the new maximum). */
export function trackerPatch(hero: Hero, current: Pick<Character, "hp_used" | "wp_used">): Partial<Character> {
  const { d, build } = buildOf(hero);
  return {
    name: hero.identity.name.trim(),
    description: describeBuild(build),
    ...build,
    hp_max: d.slots.hp,
    wp_max: d.slots.willpower,
    hp_used: Math.min(current.hp_used, d.slots.hp),
    wp_used: Math.min(current.wp_used, d.slots.willpower),
  };
}

/** The tracker record for a newly built Hero: slots and build line come from the engine, usage starts at zero */
export function characterFromHero(hero: Hero, playerId: string, takenIds: ReadonlySet<string>, sort: number, adventure = ""): Character {
  const { d, build } = buildOf(hero);
  const base = slug(hero.identity.name) || "hero";
  let id = base;
  for (let n = 2; takenIds.has(id); n++) id = `${base}-${n}`;
  return {
    id,
    player_id: playerId,
    name: hero.identity.name.trim(),
    description: describeBuild(build),
    era: "",
    ...build,
    adventures: adventure ? [adventure] : [],
    tracked: true,
    is_main: true,
    sort,
    hp_max: d.slots.hp,
    hp_used: 0,
    wp_max: d.slots.willpower,
    wp_used: 0,
    ar_max: 0,
    ar_used: 0,
  };
}
