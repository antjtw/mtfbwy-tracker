import { describe, expect, it } from "vitest";
import { applyWillpower, KINDS, resolveRoll, settle, type SettledRoll, willpowerPenalty } from "./dyad";

const done = (r: ReturnType<typeof resolveRoll>) => r as SettledRoll;

describe("Dyad Dice", () => {
  it("1/1 is a major critical failure regardless of total", () => {
    const r = done(resolveRoll({ balance: 1, despair: 1, modifier: 20, difficulty: 5 }));
    expect(r.kind).toBe(KINDS.MAJOR_CRIT_FAILURE);
    expect(r.success).toBe(false);
    expect(r.tone).toBe("despair");
    expect(r.effects.willpower).toEqual({ op: "mark", amount: 3 });
    expect(r.effects.gmDespair).toBe(3);
    expect(r.effects.focusToGM).toBe(true);
    expect(r.effects.critFailureTable).toBe(true);
  });

  it("12/12 is a major critical success regardless of total", () => {
    const r = done(resolveRoll({ balance: 12, despair: 12, modifier: -50, difficulty: 99 }));
    expect(r.kind).toBe(KINDS.MAJOR_CRIT_SUCCESS);
    expect(r.effects.willpower).toEqual({ op: "clear", amount: "all" });
  });

  it("matching 2 to 11 is a minor critical success and counts as Balance", () => {
    for (let v = 2; v <= 11; v++) {
      const r = done(resolveRoll({ balance: v, despair: v, difficulty: 99 }));
      expect(r.kind).toBe(KINDS.MINOR_CRIT_SUCCESS);
      expect(r.tone).toBe("balance");
      expect(r.effects.willpower).toEqual({ op: "clear", amount: 3 });
    }
  });

  it("success with Balance clears 1 Willpower", () => {
    const r = done(resolveRoll({ balance: 9, despair: 4, modifier: 1, difficulty: 14 }));
    expect(r.total).toBe(14);
    expect(r.kind).toBe(KINDS.SUCCESS_BALANCE);
    expect(r.effects.willpower).toEqual({ op: "clear", amount: 1 });
    expect(r.effects.gmDespair).toBe(0);
  });

  it("success with Despair: no Willpower cleared, GM gains 1 Despair and one free move", () => {
    const r = done(resolveRoll({ balance: 3, despair: 11, difficulty: 14 }));
    expect(r.kind).toBe(KINDS.SUCCESS_DESPAIR);
    expect(r.effects.willpower).toEqual({ op: "none", amount: 0 });
    expect(r.effects.gmDespair).toBe(1);
    expect(r.effects.gmFreeMove).toBe(true);
    expect(r.lines.some((l) => /1 Despair and makes one free move/.test(l))).toBe(true);
  });

  it("failure with Balance clears 1 and passes the Focus; failure with Despair marks 1 and adds 1 Despair", () => {
    const fb = done(resolveRoll({ balance: 8, despair: 2, difficulty: 14 }));
    expect(fb.kind).toBe(KINDS.FAILURE_BALANCE);
    expect(fb.effects.willpower).toEqual({ op: "clear", amount: 1 });
    expect(fb.effects.focusToGM).toBe(true);
    const fd = done(resolveRoll({ balance: 2, despair: 8, difficulty: 14 }));
    expect(fd.kind).toBe(KINDS.FAILURE_DESPAIR);
    expect(fd.effects.willpower).toEqual({ op: "mark", amount: 1 });
    expect(fd.effects.gmDespair).toBe(1);
  });

  it("with no difficulty a roll is pending until the player settles it", () => {
    const p = resolveRoll({ balance: 10, despair: 3, modifier: 2 });
    expect(p.pending).toBe(true);
    expect(p.tone).toBe("balance");
    expect(p.total).toBe(15);
    expect(settle(p, true).kind).toBe(KINDS.SUCCESS_BALANCE);
    expect(settle(p, false).kind).toBe(KINDS.FAILURE_BALANCE);
    const q = resolveRoll({ balance: 3, despair: 10 });
    expect(settle(q, true).kind).toBe(KINDS.SUCCESS_DESPAIR);
    expect(settle(q, false).kind).toBe(KINDS.FAILURE_DESPAIR);
  });

  it("criticals are never pending, and a settled roll can't be settled again", () => {
    expect(resolveRoll({ balance: 5, despair: 5 }).pending).toBe(false);
    expect(resolveRoll({ balance: 1, despair: 1 }).pending).toBe(false);
    expect(() => settle(resolveRoll({ balance: 5, despair: 5 }), true)).toThrow();
  });

  it("rejects out of range dice", () => {
    expect(() => resolveRoll({ balance: 0, despair: 5 })).toThrow(RangeError);
    expect(() => resolveRoll({ balance: 5, despair: 13 })).toThrow(RangeError);
    expect(() => resolveRoll({ balance: 5.5, despair: 5 })).toThrow(RangeError);
  });

  it("applyWillpower clamps at 0 and max and flags exhaustion", () => {
    expect(applyWillpower(2, 6, done(resolveRoll({ balance: 4, despair: 4 })))).toMatchObject({ marked: 0, exhausted: false });
    expect(applyWillpower(5, 6, done(resolveRoll({ balance: 1, despair: 9, difficulty: 30 })))).toMatchObject({ marked: 6, exhausted: true });
    expect(applyWillpower(4, 6, done(resolveRoll({ balance: 12, despair: 12 })))).toMatchObject({ marked: 0, exhausted: false });
    // No unlocked slots: nothing changes and nothing is exhausted
    expect(applyWillpower(0, 0, done(resolveRoll({ balance: 1, despair: 1 })))).toEqual({ marked: 0, exhausted: false, changed: false });
  });

  it("the Willpower penalty is -2 per slot past the sixth", () => {
    expect([0, 6, 7, 8, 12].map(willpowerPenalty)).toEqual([0, 0, 2, 4, 12]);
  });

  it("every dice pair resolves to exactly one of seven kinds", () => {
    const seen = new Set<string>();
    for (let b = 1; b <= 12; b++)
      for (let d = 1; d <= 12; d++)
        for (const ok of [true, false]) {
          let r = resolveRoll({ balance: b, despair: d });
          if (r.pending) r = settle(r, ok);
          expect(Object.values(KINDS)).toContain(r.kind);
          seen.add(r.kind!);
        }
    expect(seen.size).toBe(7);
  });
});
