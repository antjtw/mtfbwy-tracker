import { PATH_BY_ID, SPECIES_BY_ID } from "./data";
import { computeHero } from "./engine";
import type { Character, PathBuild } from "../types";
import { describeBuild } from "../build";
import { CAREER_BY_ID, ORIGIN_BY_ID } from "./data";
import type { Hero } from "./types";

const slug = (n: string) => n.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The tracker record for a newly built Hero: slots and build line come from the engine, usage starts at zero */
export function characterFromHero(hero: Hero, playerId: string, takenIds: ReadonlySet<string>, sort: number, adventure = ""): Character {
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
  const base = slug(hero.identity.name) || "hero";
  let id = base;
  for (let n = 2; takenIds.has(id); n++) id = `${base}-${n}`;
  const build = {
    species: sub && species?.subspeciesLabel === "Ancestral origin" ? `${species.name} (${sub.name})` : species?.name ?? "",
    origin: ORIGIN_BY_ID[hero.origin.id]?.name ?? "",
    career: CAREER_BY_ID[hero.career.id]?.name ?? "",
    paths,
  };
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
