import { describe, expect, it } from "vitest";
import { BUNDLED_CARDS } from "./cards";
import { choiceKey, computeHero, emptyHero, pathKey, TIER0_KEY } from "./engine";
import { sanitizeTier0, tier0Pool } from "./powers";
import { buildSheet } from "./sheet";
import type { Hero } from "./types";

function mystic(picks: string[] = []): Hero {
  const h = emptyHero();
  h.species = { id: "wookiee" };
  h.origin = { id: "force-sensitive" };
  h.path = { id: "mystic", archetypeId: "cosmic" };
  h.career = { id: "jedi-knight" };
  h.traitArray = { STR: 0, AGI: 1, RES: 1, FOR: 2, INT: 0, PRE: -1 };
  h.choices = { [choiceKey(pathKey("mystic"), "skills")]: ["Athletics", "Insight"], ...(picks.length ? { [TIER0_KEY]: picks } : {}) };
  return h;
}
const names = (cs: { name: string }[]) => cs.map((c) => c.name);

describe("extra Tier 0 Force powers", () => {
  it("asks for the picks the engine counts, and says how many are missing", () => {
    const d = computeHero(mystic());
    expect(d.powers.extraTier0Force).toBe(2);
    expect(d.issues.map((i) => i.message)).toContain("Choose 2 extra Tier 0 Force powers (you have 0)");
    const pool = tier0Pool(mystic(), BUNDLED_CARDS);
    const two = computeHero(mystic([pool[0].id, pool[1].id]));
    expect(two.issues).toEqual([]);
  });

  it("draws from the Path, Archetype and general Force Tier 0 cards, and never the Basic bundle or other paths", () => {
    const pool = tier0Pool(mystic(), BUNDLED_CARDS);
    expect(names(pool)).toEqual(expect.arrayContaining(["Foreseen evade", "Sense emotions", "Force movement", "Force senses"]));
    expect(names(pool)).not.toContain("Basic Force powers");
    expect(pool.every((c) => c.tier === 0)).toBe(true);
    expect(pool.every((c) => c.sourceType === "tradition" ? c.sourceName === "Force casting" : c.path === "Mystic")).toBe(true);
  });

  it("drops picks that aren't in the pool", () => {
    const pool = tier0Pool(mystic(), BUNDLED_CARDS);
    const h = sanitizeTier0(mystic([pool[0].id, "devout.none.made-up", pool[0].id]), BUNDLED_CARDS);
    expect(h.choices[TIER0_KEY]).toEqual([pool[0].id]);
  });

  it("lists the Basic bundle as separate abilities and the chosen powers beside them", () => {
    const pool = tier0Pool(mystic(), BUNDLED_CARDS);
    const s = buildSheet(mystic([pool[0].id, pool[1].id]), BUNDLED_CARDS);
    expect(s.abilities.filter((a) => a.source === "Basic Force powers").map((a) => a.name)).toEqual(["Telekinesis", "Life force transfer", "Evade"]);
    expect(s.abilities.find((a) => a.name === "Evade")?.kind).toBe("trigger");
    expect(s.abilities.filter((a) => a.source === "Tier 0 Force power")).toHaveLength(2);
  });
});
