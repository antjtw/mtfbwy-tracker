import { describe, expect, it } from "vitest";
import { cardOptions, cardProblems, cardDue } from "./cardEligibility";
import { BUNDLED_CARDS } from "./cards";
import { choiceKey, emptyHero, pathKey } from "./engine";
import type { Card, Hero, LevelEntry } from "./types";

const picks = [{ optionId: "hp_slot" as const }, { optionId: "wp_slot" as const }];
const L = (n: number, pathId: string, archetypeId: string, cardId?: string): LevelEntry => ({ characterLevel: n, pathId, archetypeId, picks, ...(cardId ? { cardId } : {}) });

function hero(path: string, archetype: string, skills: string[], log: LevelEntry[] = []): Hero {
  const h = emptyHero();
  h.species = { id: "wookiee" };
  h.origin = { id: "force-sensitive" };
  h.path = { id: path, archetypeId: archetype };
  h.career = { id: "jedi-knight" };
  h.traitArray = { STR: 0, AGI: 1, RES: 1, FOR: 2, INT: 0, PRE: -1 };
  h.choices = { [choiceKey(pathKey(path), "skills")]: skills };
  h.levelLog = log;
  return h;
}
const mystic = (log: LevelEntry[] = []) => hero("mystic", "cosmic", ["Athletics", "Insight"], log);
const byName = (opts: ReturnType<typeof cardOptions>["options"], name: string) => opts.find((o) => o.card.name === name);

describe("card eligibility", () => {
  it("offers nothing at a level that earns no card, and at level 2 for a Mystic offers Path and Archetype cards", () => {
    expect(cardDue(mystic(), L(2, "mystic", "cosmic"))).not.toBeNull();
    const { options } = cardOptions(mystic(), L(2, "mystic", "cosmic"), BUNDLED_CARDS);
    expect(byName(options, "Foresight")?.eligible).toBe(true); // Mystic Path, Tier 1
    expect(byName(options, "Battle meditation")?.eligible).toBe(true); // Cosmic Archetype, Tier 1
    expect(byName(options, "Foreseen evade")?.eligible).toBe(true); // Tier 0 is below the ceiling
    expect(options.every((o) => o.card.path === "Mystic")).toBe(true);
    expect(options.some((o) => o.card.archetype === "Guardian")).toBe(false);
  });

  it("locks cards above the tier ceiling, with the level they open at", () => {
    const { options } = cardOptions(mystic(), L(2, "mystic", "cosmic"), BUNDLED_CARDS);
    expect(byName(options, "Force barrier")).toMatchObject({ eligible: false, reason: "Tier 2, available from level 5" });
    expect(byName(options, "Sever Force")).toMatchObject({ eligible: false, reason: "Tier 3, available from level 9" });
    // Available cards come first
    const firstLocked = options.findIndex((o) => !o.eligible);
    expect(options.slice(firstLocked).every((o) => !o.eligible)).toBe(true);
  });

  it("won't offer a card the Hero already has", () => {
    const foresight = BUNDLED_CARDS.find((c) => c.name === "Foresight" && c.path === "Mystic")!;
    const h = mystic([L(2, "mystic", "cosmic", foresight.id)]);
    const { options } = cardOptions(h, L(3, "mystic", "cosmic"), BUNDLED_CARDS);
    expect(byName(options, "Foresight")).toMatchObject({ eligible: false, reason: "You already have this card" });
  });

  it("opens Tier 2 once the level reaches it", () => {
    const log = [2, 3, 4, 5].map((n) => L(n, "mystic", "cosmic", n === 5 ? undefined : `x${n}`));
    const { options } = cardOptions(mystic(log.slice(0, 4)), L(6, "mystic", "cosmic"), BUNDLED_CARDS);
    expect(byName(options, "Force barrier")?.eligible).toBe(true);
    expect(byName(options, "Sever Force")?.eligible).toBe(false);
  });

  it("locks a card until its Archetype feature exists", () => {
    const fake: Card = { ...BUNDLED_CARDS.find((c) => c.name === "Second Chance")!, tier: 1, prerequisite: { kind: "archetype_feature", name: "Step In", featureKey: "vanguard/spearhead:step-in" } };
    const h = hero("vanguard", "spearhead", ["Medicine", "Insight"]);
    const { options } = cardOptions(h, L(2, "vanguard", "spearhead"), [fake]);
    expect(options[0]).toMatchObject({ eligible: false, reason: "Needs Step In" });
    // Spearhead level 6 has Step In (level 5)
    const log = [2, 3, 4, 5].map((n) => L(n, "vanguard", "spearhead", `x${n}`));
    expect(cardOptions(hero("vanguard", "spearhead", ["Medicine", "Insight"], log), L(6, "vanguard", "spearhead"), [fake]).options[0].eligible).toBe(true);
  });

  it("checks the choice on an entry", () => {
    const base = mystic();
    const entry = L(2, "mystic", "cosmic");
    expect(cardProblems(base, entry, BUNDLED_CARDS)).toEqual(["Level 2: choose a card"]);
    const foresight = BUNDLED_CARDS.find((c) => c.name === "Foresight" && c.path === "Mystic")!;
    expect(cardProblems(base, { ...entry, cardId: foresight.id }, BUNDLED_CARDS)).toEqual([]);
    const barrier = BUNDLED_CARDS.find((c) => c.name === "Force barrier")!;
    expect(cardProblems(base, { ...entry, cardId: barrier.id }, BUNDLED_CARDS)[0]).toMatch(/Tier 2/);
    const wrongPath = BUNDLED_CARDS.find((c) => c.path === "Devout")!;
    expect(cardProblems(base, { ...entry, cardId: wrongPath.id }, BUNDLED_CARDS)[0]).toMatch(/isn't on Mystic/);
  });
});
