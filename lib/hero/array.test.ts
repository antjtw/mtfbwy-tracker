import { describe, expect, it } from "vitest";
import { arrayLeft, cleanTraitArray, computeHero, emptyHero, validateTraitArray } from "./engine";
import { sanitizeHero } from "./sanitize";
import type { Trait } from "./types";

const arr = (o: Partial<Record<Trait, number | null>>) => ({ STR: null, AGI: null, RES: null, FOR: null, INT: null, PRE: null, ...o }) as Record<Trait, number | null>;

describe("the starting array", () => {
  it("starts with nothing placed and the whole array to give out", () => {
    expect(emptyHero().traitArray).toEqual(arr({}));
    expect(arrayLeft(emptyHero().traitArray).sort()).toEqual([-1, 0, 0, 1, 1, 2]);
    expect(validateTraitArray(emptyHero().traitArray)).toBe(false);
  });

  it("takes a value out of what is left once a trait has it, and hands it back when the trait is cleared", () => {
    expect(arrayLeft(arr({ STR: 2 })).sort()).toEqual([-1, 0, 0, 1, 1]);
    expect(arrayLeft(arr({ STR: 2, AGI: 1, RES: 1 })).sort()).toEqual([-1, 0, 0]);
    // A trait's own value stays on offer to itself
    expect(arrayLeft(arr({ STR: 2 }), "STR").sort()).toEqual([-1, 0, 0, 1, 1, 2]);
    // Only one +2: once placed it isn't left for anyone else
    expect(arrayLeft(arr({ STR: 2 }), "AGI")).not.toContain(2);
  });

  it("leaves one option for the last trait", () => {
    const a = arr({ STR: 2, AGI: 1, RES: 1, FOR: 0, INT: 0 });
    expect(arrayLeft(a, "PRE")).toEqual([-1]);
    expect(validateTraitArray({ ...a, PRE: -1 })).toBe(true);
  });

  it("rejects all +2, and a Hero with unplaced traits can't be saved as complete", () => {
    const all2 = arr({ STR: 2, AGI: 2, RES: 2, FOR: 2, INT: 2, PRE: 2 });
    expect(validateTraitArray(all2)).toBe(false);
    expect(computeHero({ ...emptyHero(), traitArray: all2 }).issues.map((i) => i.code)).toContain("array");
  });

  it("tidies an older all +0 array to nothing placed, and keeps what fits otherwise", () => {
    expect(cleanTraitArray({ STR: 0, AGI: 0, RES: 0, FOR: 0, INT: 0, PRE: 0 })).toEqual(arr({}));
    expect(cleanTraitArray(arr({ STR: 2, AGI: 2, RES: 1 }))).toEqual(arr({ STR: 2, RES: 1 }));
    const ok = arr({ STR: 2, AGI: 1, RES: 1, FOR: 0, INT: 0, PRE: -1 });
    expect(cleanTraitArray(ok)).toBe(ok);
  });

  it("reads a missing value from the browser as not placed", () => {
    const h = sanitizeHero({ traitArray: { STR: 2, AGI: "x" } })!;
    expect(h.traitArray.STR).toBe(2);
    expect(h.traitArray.AGI).toBeNull();
    expect(h.traitArray.PRE).toBeNull();
  });
});
