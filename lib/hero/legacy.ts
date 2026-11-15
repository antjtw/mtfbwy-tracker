import { CAREERS, ORIGINS, PATH_BY_ID, SPECIES } from "./data";
import { computeHero, emptyHero } from "./engine";
import type { Hero, LevelEntry } from "./types";
import type { Character } from "../types";

/*
 * Rebuilds a half-built Hero from a tracker character's recorded build (species, origin, Paths with
 * Archetype levels, career). Everything the rules make implicit is then filled in by the engine; what
 * only the player knows (trait array, skill picks, level-up picks, cards) is left blank for them to complete.
 */

const slug = (n: string) => n.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const SPECIES_ALIASES: Record<string, string> = { tynann: "tynnan", zebrak: "zabrak", "second-class-droid": "droid-2", "third-class-droid": "droid-3", "fourth-class-droid": "droid-4" };

export interface LegacyResult {
  hero: Hero;
  /** Parts of the recorded build that have no match in the rules data yet */
  unmapped: string[];
}

export function heroFromCharacter(c: Pick<Character, "name" | "species" | "origin" | "career" | "paths">): LegacyResult {
  const unmapped: string[] = [];
  const hero = emptyHero();
  hero.imported = true;
  hero.identity.name = c.name;

  // Species, with an ancestry in brackets for Humans: "Human (Coruscanti)"
  const m = (c.species ?? "").match(/^(.*?)\s*\((.*)\)$/);
  const speciesName = m ? m[1] : c.species ?? "";
  const sid = SPECIES_ALIASES[slug(speciesName)] ?? slug(speciesName);
  const species = SPECIES.find((s) => s.id === sid);
  if (species) {
    hero.species = { id: species.id };
    const sub = m && species.subspecies?.find((s) => s.id === slug(m[2]));
    if (sub) hero.species.subspeciesId = sub.id;
  } else if (c.species) unmapped.push(`species ${c.species}`);

  const origin = ORIGINS.find((o) => o.id === slug(c.origin ?? ""));
  if (origin) hero.origin = { id: origin.id };
  else if (c.origin) unmapped.push(`origin ${c.origin}`);

  const career = CAREERS.find((x) => x.id === slug(c.career ?? ""));
  if (career) hero.career = { id: career.id };
  else if (c.career) unmapped.push(`career ${c.career}`);

  // Paths: the first listed is the one they began with; levels follow in the order they must have been taken
  const paths = c.paths ?? [];
  const log: LevelEntry[] = [];
  let level = 1;
  paths.forEach((p, i) => {
    const def = PATH_BY_ID[slug(p.path)];
    if (!def) {
      unmapped.push(`path ${p.path}`);
      return;
    }
    p.archetypes.forEach((a, ai) => {
      const arch = def.archetypes.find((x) => x.id === slug(a.name));
      if (!arch || arch.locked) unmapped.push(`archetype ${a.name} (${def.name})`);
      const archetypeId = slug(a.name);
      if (i === 0 && ai === 0) hero.path = { id: def.id, archetypeId };
      let remaining = a.level;
      if (i > 0 || ai > 0) {
        // Branching into a new Path (or a second Archetype) uses the level it starts at
        level++;
        log.push({
          characterLevel: level,
          pathId: def.id,
          archetypeId,
          picks: [i > 0 ? { optionId: "multi_path", pathId: def.id, archetypeId } : { optionId: "diversify" }],
        });
        remaining--;
      } else remaining--; // level 1 is creation
      while (remaining-- > 0) {
        level++;
        log.push({ characterLevel: level, pathId: def.id, archetypeId, picks: [] });
      }
    });
  });
  hero.levelLog = log;
  hero.startingLevel = level;
  return { hero, unmapped };
}

/** What still has to be filled in before the Hero is complete, in the engine's words */
export const outstanding = (hero: Hero) => computeHero(hero).issues;
