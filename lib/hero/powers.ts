import { PATH_BY_ID } from "./data";
import { computeHero, TIER0_KEY } from "./engine";
import type { Card, Hero } from "./types";

/*
 * The extra Tier 0 Force power picks (spec 5.7, D15). The pool is any Tier 0 card on the Hero's Path (whatever
 * its Archetype), in the Hero's Archetype, or a general Force casting Tier 0 card. Powers already in the Basic
 * Force bundle are theirs already.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const BASIC_FORCE_ID = "force-casting.none.basic-force-powers";

/** The powers a Basic bundle gives, by name ("Telekinesis", "Life force transfer", "Evade") */
export function bundlePowerNames(card: Card | undefined): string[] {
  return (card?.content ?? "").split("\n").map((l) => l.match(/^([^:]{2,40}):/)?.[1].trim() ?? "").filter(Boolean);
}

export function tier0Pool(hero: Hero, cards: readonly Card[]): Card[] {
  const path = PATH_BY_ID[hero.path.id];
  const archetype = path?.archetypes.find((a) => a.id === hero.path.archetypeId);
  const bundle = new Set(bundlePowerNames(cards.find((c) => c.id === BASIC_FORCE_ID)).map((n) => n.toLowerCase()));
  return cards.filter((c) => {
    if (c.tier !== 0 || c.id === BASIC_FORCE_ID || bundle.has(c.name.toLowerCase())) return false;
    const onPath = c.sourceType === "path" && !!path && slug(c.path) === slug(path.name);
    const inArchetype = c.sourceType === "path" && !!archetype && slug(c.archetype) === slug(archetype.name);
    const general = c.sourceType === "tradition" && c.sourceName === "Force casting";
    return onPath || inArchetype || general;
  });
}

/** Drops any picked card that isn't in the pool, so a made-up id can't count */
export function sanitizeTier0(hero: Hero, cards: readonly Card[]): Hero {
  const picked = hero.choices[TIER0_KEY];
  if (!Array.isArray(picked)) return hero;
  const pool = new Set(tier0Pool(hero, cards).map((c) => c.id));
  return { ...hero, choices: { ...hero.choices, [TIER0_KEY]: [...new Set(picked)].filter((id) => pool.has(id)) } };
}

export const extraPowerCount = (hero: Hero) => computeHero(hero).powers.extraTier0Force;
