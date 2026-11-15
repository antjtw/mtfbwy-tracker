import { ARCHETYPE_FEATURES, archetypeKey, PATH_BY_ID } from "./data";
import { CAREER_FEATURES, ORIGIN_FEATURES, SPECIES_FEATURES } from "./data/features";
import { abilityKind, type AbilityKind } from "./abilityKind";
import { computeHero } from "./engine";
import { rollModifiers, type RollModMap } from "./rollModifiers";
import type { Card, Hero, ProficiencyStep, Trait } from "./types";
import { SKILLS, TRAITS } from "./types";

/*
 * What the character sheet tabs show, as plain data a page can hand to the browser.
 * Everything here is computed from the Hero; the only thing kept is which uses are spent (Hero.play).
 */

export type Refresh = "short" | "full" | "session" | "encounter" | "scene";

export interface SheetAbility {
  key: string;
  name: string;
  source: string;
  text: string;
  kind: AbilityKind;
  /** Willpower cost, for cards */
  cost?: string;
  /** Present when the text says it can be used once per rest, session or the like */
  per?: Refresh;
}

export interface SheetResource {
  key: string;
  name: string;
  label: string;
  /** Dice or marks you hold */
  count: number;
  /** Uses that get spent (Fury, Assess); a die you roll isn't spent */
  spendable: boolean;
  refresh?: Refresh;
  note?: string;
}

export interface Sheet {
  name: string;
  level: number;
  complete: boolean;
  issues: string[];
  traits: { trait: Trait; modifier: number }[];
  saves: { trait: Trait; modifier: number; proficient: boolean }[];
  skills: { skill: string; trait: Trait; modifier: number; step: ProficiencyStep; sources: string[] }[];
  passives: { name: string; trait: Trait; value: number }[];
  proficiencyBonus: number;
  evasion: number;
  /** Metres, and the same distance in 1.5m grid squares */
  speed: { metres: number; squares: number; note: string };
  casting: { kind: string; modifier: number }[];
  languages: string;
  /** Advantage and Disadvantage on skills and saving rolls, with the abilities they come from */
  rollMods: RollModMap;
  resources: SheetResource[];
  abilities: SheetAbility[];
  used: Record<string, number>;
}

/** Standard movement is Far to Close, around 9m; a few species differ */
const SPEED: Record<string, { metres: number; note: string }> = {
  vintian: { metres: 4.5, note: "Half standard speed" },
  anzellan: { metres: 7.5, note: "Standard to Close" },
};

export function refreshOf(text: string): Refresh | undefined {
  const m = text.match(/\b(?:once|(?:\d+|one|two|three) times?)\s+per\s+(short rest|full rest|session|encounter|scene)\b/i) ?? text.match(/\bper\s+(short rest|full rest)\b/i);
  if (!m) return undefined;
  const w = m[1].toLowerCase();
  return w === "short rest" ? "short" : w === "full rest" ? "full" : (w as Refresh);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function buildSheet(hero: Hero, cards: readonly Card[] = []): Sheet {
  const d = computeHero(hero);
  const base = SPEED[hero.species.id] ?? { metres: 9, note: "Far to Close" };
  const speed = { ...base, squares: Math.round(base.metres / 1.5) };
  const mod = (t: Trait) => d.traits[t];

  const abilities: SheetAbility[] = [];
  const seen = new Set<string>();
  const add = (source: string, name: string, text: string) => {
    const k = `${slug(source)}:${slug(name)}`;
    if (seen.has(k)) return;
    seen.add(k);
    abilities.push({ key: k, name, source, text, kind: abilityKind(name, text), per: refreshOf(text) });
  };
  for (const f of SPECIES_FEATURES[hero.species.id] ?? []) add("Species", f.name, f.text);
  for (const f of ORIGIN_FEATURES[hero.origin.id] ?? []) add("Origin", f.name, f.text);
  for (const f of CAREER_FEATURES[hero.career.id] ?? []) add("Career", f.name, f.text);
  for (const p of d.paths) {
    const def = PATH_BY_ID[p.pathId];
    for (const a of p.archetypes) {
      const archName = def?.archetypes.find((x) => x.id === a.archetypeId)?.name ?? a.archetypeId;
      for (const f of ARCHETYPE_FEATURES[archetypeKey(p.pathId, a.archetypeId)] ?? []) {
        if (a.level >= f.level) add(`${def?.name}, ${archName}`, f.name, f.text);
      }
    }
  }

  // Cards chosen at level-up, grouped with everything else by how they are used
  for (const e of hero.levelLog) {
    const card = e.cardId ? cards.find((c) => c.id === e.cardId) : undefined;
    if (!card) continue;
    const k = `card:${card.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const kind = abilityKind(card.name, card.content);
    abilities.push({
      key: k,
      name: card.name,
      source: `Card, tier ${card.tier}${card.archetype ? `, ${card.archetype}` : ""}`,
      text: card.content,
      cost: card.willpowerCostText || undefined,
      kind: kind === "passive" && card.actionRoll === "Yes" ? "move" : kind,
      per: refreshOf(card.content),
    });
  }

  const resources: SheetResource[] = d.resources.map((r) => ({
    key: `res:${r.pathId}`,
    name: r.name,
    label: r.text,
    count: r.count,
    spendable: r.kind === "fury" || r.kind === "assess",
    refresh: r.kind === "assess" ? "short" : r.kind === "fury" ? "full" : undefined,
    note: r.kind === "fury" ? `+${r.extra} damage when you use it` : undefined,
  }));

  return {
    name: hero.identity.name,
    level: d.characterLevel,
    complete: d.issues.length === 0,
    issues: d.issues.map((i) => i.message),
    traits: TRAITS.map((trait) => ({ trait, modifier: mod(trait) })),
    saves: d.saves,
    skills: SKILLS.map(({ name }) => d.skills.find((s) => s.skill === name)!).map((s) => ({ skill: s.skill, trait: s.trait, modifier: s.modifier, step: s.step, sources: s.sources })),
    passives: [
      { name: "Insight", trait: "PRE", value: 12 + (d.skills.find((s) => s.skill === "Insight")?.modifier ?? 0) },
      { name: "Force", trait: "FOR", value: 12 + mod("FOR") },
      { name: "Perception", trait: "PRE", value: 12 + (d.skills.find((s) => s.skill === "Perception")?.modifier ?? 0) },
    ],
    proficiencyBonus: d.proficiencyBonus,
    evasion: d.evasion,
    speed,
    casting: d.casting.map((c) => ({ kind: c.kind, modifier: c.modifier })),
    languages: hero.identity.languages,
    rollMods: rollModifiers(abilities),
    resources,
    abilities,
    used: hero.play?.used ?? {},
  };
}

/** Which keys a rest clears: a short rest clears short-rest and per-encounter or scene uses, a full rest also clears full-rest ones */
export function keysToClear(sheet: Sheet, rest: "short" | "full"): string[] {
  const clears = (r?: Refresh) => (r === "short" || r === "encounter" || r === "scene") || (rest === "full" && r === "full");
  return [
    ...sheet.abilities.filter((a) => clears(a.per)).map((a) => `ability:${a.key}`),
    ...sheet.resources.filter((r) => r.spendable && clears(r.refresh)).map((r) => r.key),
  ];
}
