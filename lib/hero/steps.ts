import { choiceKey, careerKey, computeHero, originKey, pathKey, speciesKey, subspeciesKey, TIER0_KEY, validateTraitArray } from "./engine";
import { CAREER_BY_ID, ORIGIN_BY_ID, PATH_BY_ID, SPECIES_BY_ID } from "./data";
import { type Choice, type Hero, type SkillName, SKILLS, type Source, TRAITS } from "./types";

export const STEPS = [
  { key: "adventure", label: "Adventure" },
  { key: "species", label: "Species" },
  { key: "origin", label: "Origin" },
  { key: "path", label: "Path" },
  { key: "career", label: "Career" },
  { key: "powers", label: "Powers" },
  { key: "traits", label: "Traits" },
  { key: "identity", label: "Identity" },
  { key: "review", label: "Review" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

const asArray = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** Problems with one source's choices, in words the player can act on */
export function choiceProblems(hero: Hero, sourceKey: string, choices: readonly Choice[]): string[] {
  const out: string[] = [];
  for (const c of choices) {
    const a = hero.choices[choiceKey(sourceKey, c.id)];
    if (c.kind === "text") continue;
    if (c.kind === "skill") {
      const n = asArray(a).length;
      if (n !== c.n) out.push(c.n === 1 ? `Choose ${c.label.toLowerCase()}` : `${c.label}: choose ${c.n} (you have ${n})`);
    } else if (!asArray(a)[0]) out.push(`Choose ${c.label.toLowerCase()}`);
  }
  return out;
}

/** What's still missing before a step can be left. Empty means it's complete. */
export function stepProblems(hero: Hero, step: StepKey): string[] {
  switch (step) {
    case "species": {
      const sp = SPECIES_BY_ID[hero.species.id];
      if (!sp) return ["Choose a species"];
      const out: string[] = [];
      if (sp.subspecies && !sp.subspecies.some((s) => s.id === hero.species.subspeciesId)) out.push(`Choose ${(sp.subspeciesLabel ?? "a kind").toLowerCase()}`);
      out.push(...choiceProblems(hero, speciesKey(sp.id), sp.choices));
      const sub = sp.subspecies?.find((s) => s.id === hero.species.subspeciesId);
      if (sub) out.push(...choiceProblems(hero, subspeciesKey(sp.id, sub.id), sub.choices));
      return out;
    }
    case "origin": {
      const o = ORIGIN_BY_ID[hero.origin.id];
      return o ? choiceProblems(hero, originKey(o.id), o.choices) : ["Choose an origin"];
    }
    case "path": {
      const p = PATH_BY_ID[hero.path.id];
      if (!p) return ["Choose a path"];
      const out: string[] = [];
      if (!p.archetypes.some((a) => a.id === hero.path.archetypeId && !a.locked)) out.push("Choose an archetype");
      const skills = asArray(hero.choices[choiceKey(pathKey(p.id), "skills")]);
      if (skills.length !== 2) out.push(`Choose 2 skills (you have ${skills.length})`);
      return out;
    }
    case "career": {
      const c = CAREER_BY_ID[hero.career.id];
      return c ? choiceProblems(hero, careerKey(c.id), c.choices) : ["Choose a career"];
    }
    case "powers": {
      const need = computeHero(hero).powers.extraTier0Force;
      const have = asArray(hero.choices[TIER0_KEY]).length;
      return need > 0 && have !== need ? [`Choose ${need} extra Tier 0 Force power${need === 1 ? "" : "s"} (you have ${have})`] : [];
    }
    case "adventure":
      return [];
    case "traits":
      return validateTraitArray(hero.traitArray) ? [] : ["Use each value in the starting array once"];
    case "identity":
      return hero.identity.name.trim() ? [] : ["Give your Hero a name"];
    case "review":
      return [];
  }
}

export const sourcesOf = (hero: Hero): { key: string; source: Source }[] => {
  const out: { key: string; source: Source }[] = [];
  const sp = SPECIES_BY_ID[hero.species.id];
  if (sp) {
    out.push({ key: speciesKey(sp.id), source: sp });
    const sub = sp.subspecies?.find((s) => s.id === hero.species.subspeciesId);
    if (sub) out.push({ key: subspeciesKey(sp.id, sub.id), source: sub });
  }
  const o = ORIGIN_BY_ID[hero.origin.id];
  if (o) out.push({ key: originKey(o.id), source: o });
  const c = CAREER_BY_ID[hero.career.id];
  if (c) out.push({ key: careerKey(c.id), source: c });
  return out;
};

export const ALL_SKILLS: readonly SkillName[] = SKILLS.map((s) => s.name);
export { TRAITS };
