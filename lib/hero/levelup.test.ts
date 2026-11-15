import { describe, expect, it } from "vitest";
import { choiceKey, computeHero, emptyHero, pathKey } from "./engine";
import { changesBetween, creationIssues, entryComplete, entryProblems, levelInfo, levelToWorkOn, sanitizeEntry, tierFor } from "./levelup";
import type { Hero, LevelEntry } from "./types";

function mystic(log: LevelEntry[] = []): Hero {
  const h = emptyHero();
  h.species = { id: "wookiee" };
  h.origin = { id: "force-sensitive" };
  h.path = { id: "mystic", archetypeId: "cosmic" };
  h.career = { id: "jedi-knight" };
  h.traitArray = { STR: 0, AGI: 1, RES: 1, FOR: 2, INT: 0, PRE: -1 };
  h.choices = { [choiceKey(pathKey("mystic"), "skills")]: ["Athletics", "Insight"] };
  h.levelLog = log;
  return h;
}
const L = (n: number, ...picks: LevelEntry["picks"]): LevelEntry => ({ characterLevel: n, pathId: "mystic", archetypeId: "cosmic", picks });

describe("level-up helpers", () => {
  it("starts a finished level 1 Hero at level 2", () => {
    const h = mystic();
    expect(creationIssues(h)).toEqual([]);
    expect(levelToWorkOn(h)).toBe(2);
    const info = levelInfo(h, 2)!;
    expect(info.tier).toBe(1);
    expect(info.followed.map((f) => f.archetypeId)).toEqual(["cosmic"]);
    expect(info.options.find((o) => o.option.id === "diversify")?.available).toBe(false); // from level 5
  });

  it("won't open a level that isn't next", () => {
    expect(levelInfo(mystic(), 3)).toBeNull();
    expect(levelInfo(mystic(), 1)).toBeNull();
  });

  it("asks for the first level that is missing its picks", () => {
    const h = mystic([{ ...L(2, { optionId: "hp_slot" }, { optionId: "wp_slot" }), cardId: "x" }, L(3), L(4)]);
    expect(entryComplete(h.levelLog[0])).toBe(true);
    expect(levelToWorkOn(h)).toBe(3);
  });

  it("applies an entry and reports what changed", () => {
    const h = mystic();
    const e = L(2, { optionId: "trait", trait: "FOR", tier: 1 }, { optionId: "hp_slot", tier: 1 });
    expect(entryProblems(h, e)).toEqual([]);
    const ch = changesBetween(computeHero(h), computeHero({ ...h, levelLog: [e] }));
    expect(ch.find((c) => c.label === "FOR")?.to).toBe("+4");
    expect(ch.find((c) => c.label === "Hit Point slots")?.to).toBe("7");
  });

  it("rejects one pick, and a pick that isn't offered", () => {
    const h = mystic();
    expect(entryProblems(h, L(2, { optionId: "hp_slot", tier: 1 })).join()).toMatch(/two options/);
    expect(entryProblems(h, L(2, { optionId: "fury_damage", tier: 1 }, { optionId: "hp_slot", tier: 1 })).join()).toMatch(/isn't offered/);
  });

  it("falls back to an earlier tier column once the current one is used", () => {
    // Skill tier: 2 uses in tier 1 only (Wayfarer); a Mystic's trait picks have 2 per tier
    const h = mystic([L(2, { optionId: "trait", trait: "FOR", tier: 1 }, { optionId: "trait", trait: "AGI", tier: 1 }), L(3, { optionId: "hp_slot" }, { optionId: "wp_slot" }), L(4, { optionId: "hp_slot" }, { optionId: "wp_slot" }), L(5, { optionId: "hp_slot" }, { optionId: "wp_slot" })]);
    const info = levelInfo(h, 6)!;
    const trait = info.options.find((o) => o.option.id === "trait")!;
    expect(tierFor(trait, [])).toBe(2);
  });

  it("reads entries from untrusted input", () => {
    const e = sanitizeEntry({ pathId: "mystic", archetypeId: "cosmic", picks: [{ optionId: "trait", trait: "FOR", tier: 1, junk: 1 }, { optionId: "nope" }, { optionId: "hp_slot" }, { optionId: "wp_slot" }] }, 2)!;
    expect(e.picks).toEqual([{ optionId: "trait", tier: 1, trait: "FOR" }, { optionId: "hp_slot" }]);
    expect(sanitizeEntry("x", 2)).toBeNull();
  });
});
