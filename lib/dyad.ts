/*
 * Dyad Dice resolver. Pure functions, no DOM.
 * Rules: Closed Beta Playtest v1.2.0 "Balance and Despair" plus the rulings log (R-27, R-28, R-31, R-38).
 * An ordinary roll comes back `pending`: the app can't know whether it succeeded, so the player says so
 * and `settle` finishes it. Matching dice are always a critical and never pending.
 */

export const KINDS = {
  MAJOR_CRIT_SUCCESS: "major_critical_success",
  MINOR_CRIT_SUCCESS: "minor_critical_success",
  MAJOR_CRIT_FAILURE: "major_critical_failure",
  SUCCESS_BALANCE: "success_with_balance",
  SUCCESS_DESPAIR: "success_with_despair",
  FAILURE_BALANCE: "failure_with_balance",
  FAILURE_DESPAIR: "failure_with_despair",
} as const;
export type Kind = (typeof KINDS)[keyof typeof KINDS];
export type Tone = "balance" | "despair";

const LABELS: Record<Kind, string> = {
  major_critical_success: "Major critical success",
  minor_critical_success: "Minor critical success",
  major_critical_failure: "Major critical failure",
  success_with_balance: "Success with Balance",
  success_with_despair: "Success with Despair",
  failure_with_balance: "Failure with Balance",
  failure_with_despair: "Failure with Despair",
};

export interface Effects {
  willpower: { op: "clear" | "mark" | "none"; amount: number | "all" };
  /** Despair the GM gains */
  gmDespair: number;
  /** The GM also makes ONE free move (R-27, R-31, R-38: Despair and a free move, never stacked) */
  gmFreeMove?: boolean;
  /** The Focus shifts to the GM once the roll is resolved (shown as a message, not tracked) */
  focusToGM: boolean;
  critFailureTable?: boolean;
}

const EFFECTS: Record<Kind, Effects> = {
  major_critical_success: { willpower: { op: "clear", amount: "all" }, gmDespair: 0, focusToGM: false },
  minor_critical_success: { willpower: { op: "clear", amount: 3 }, gmDespair: 0, focusToGM: false },
  major_critical_failure: { willpower: { op: "mark", amount: 3 }, gmDespair: 3, focusToGM: true, critFailureTable: true },
  success_with_balance: { willpower: { op: "clear", amount: 1 }, gmDespair: 0, focusToGM: false },
  success_with_despair: { willpower: { op: "none", amount: 0 }, gmDespair: 1, gmFreeMove: true, focusToGM: false },
  failure_with_balance: { willpower: { op: "clear", amount: 1 }, gmDespair: 0, focusToGM: true },
  failure_with_despair: { willpower: { op: "mark", amount: 1 }, gmDespair: 1, focusToGM: true },
};

interface Base {
  balance: number;
  despair: number;
  modifier: number;
  /** d6s rolled for Advantage (added to the total) and Disadvantage (taken from it). They don't change Balance or Despair. */
  advantage: number[];
  disadvantage: number[];
  difficulty: number | null;
  total: number;
}
export interface PendingRoll extends Base {
  pending: true;
  critical: false;
  tone: Tone;
  kind: null;
  label: string;
  success: null;
  effects: null;
  lines: string[];
}
export interface SettledRoll extends Base {
  pending: false;
  critical: boolean;
  tone: Tone;
  kind: Kind;
  label: string;
  success: boolean;
  effects: Effects;
  lines: string[];
}
export type RollOutcome = PendingRoll | SettledRoll;

function assertDie(n: number, name: string) {
  if (!Number.isInteger(n) || n < 1 || n > 12) throw new RangeError(`${name} must be an integer 1 to 12, got ${n}`);
}

/** Plain-English lines describing what the outcome does, for the banner */
export function describeEffects(kind: Kind): string[] {
  const e = EFFECTS[kind];
  const lines: string[] = [];
  const w = e.willpower;
  if (w.op === "clear") lines.push(w.amount === "all" ? "Clear all your Willpower slots" : `Clear ${w.amount} Willpower slot${w.amount > 1 ? "s" : ""}`);
  if (w.op === "mark") lines.push(`Mark ${w.amount} Willpower slot${(w.amount as number) > 1 ? "s" : ""}`);
  if (e.gmDespair > 0) lines.push(`The GM gains ${e.gmDespair} Despair${e.gmFreeMove ? " and makes one free move" : ""}`);
  if (e.focusToGM) lines.push("The Focus now shifts to the GM");
  if (e.critFailureTable) lines.push("Roll on the Critical failure table (d20)");
  if (e.gmDespair === 0 && w.op === "none" && !e.focusToGM) lines.push("No cost");
  return lines;
}

function build(kind: Kind, base: Base & { tone: Tone; critical: boolean }): SettledRoll {
  const e = EFFECTS[kind];
  return { ...base, pending: false, kind, label: LABELS[kind], success: kind.includes("success"), effects: { ...e, willpower: { ...e.willpower } }, lines: describeEffects(kind) };
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/** The d6s of Advantage and Disadvantage: +1d6 and −1d6 each, as many as the rules give (rituals can add more than one) */
export const bonusDiceTotal = (advantage: number[], disadvantage: number[]) => sum(advantage) - sum(disadvantage);

export function resolveRoll({ balance, despair, modifier = 0, difficulty = null, advantage = [], disadvantage = [] }: { balance: number; despair: number; modifier?: number; difficulty?: number | null; advantage?: number[]; disadvantage?: number[] }): RollOutcome {
  assertDie(balance, "balance");
  assertDie(despair, "despair");
  [...advantage, ...disadvantage].forEach((n) => { if (!Number.isInteger(n) || n < 1 || n > 6) throw new RangeError(`an advantage or disadvantage die must be 1 to 6, got ${n}`); });
  const total = balance + despair + modifier + bonusDiceTotal(advantage, disadvantage);
  const base: Base = { balance, despair, modifier, advantage, disadvantage, difficulty, total };

  // Matching dice are always a critical, so there are no ties to handle below
  if (balance === 1 && despair === 1) return build(KINDS.MAJOR_CRIT_FAILURE, { ...base, tone: "despair", critical: true });
  if (balance === 12 && despair === 12) return build(KINDS.MAJOR_CRIT_SUCCESS, { ...base, tone: "balance", critical: true });
  if (balance === despair) return build(KINDS.MINOR_CRIT_SUCCESS, { ...base, tone: "balance", critical: true });

  const tone: Tone = balance > despair ? "balance" : "despair";
  const pending: PendingRoll = { ...base, pending: true, critical: false, tone, kind: null, label: tone === "balance" ? "Balance" : "Despair", success: null, effects: null, lines: [] };
  if (difficulty === null || difficulty === undefined || Number.isNaN(difficulty)) return pending;
  return settle(pending, total >= difficulty);
}

/** Finishes a pending roll once the player says whether it succeeded */
export function settle(outcome: RollOutcome, succeeded: boolean): SettledRoll {
  if (!outcome.pending) throw new Error("Roll is already settled");
  const kind = outcome.tone === "balance" ? (succeeded ? KINDS.SUCCESS_BALANCE : KINDS.FAILURE_BALANCE) : succeeded ? KINDS.SUCCESS_DESPAIR : KINDS.FAILURE_DESPAIR;
  const { pending: _p, kind: _k, label: _l, success: _s, effects: _e, lines: _li, ...rest } = outcome;
  void [_p, _k, _l, _s, _e, _li];
  return build(kind, rest);
}

/** Applies an outcome's Willpower change to a count of marked slots, clamped to 0..max */
export function applyWillpower(marked: number, max: number, outcome: SettledRoll): { marked: number; exhausted: boolean; changed: boolean } {
  const w = outcome.effects.willpower;
  let next = marked;
  if (w.op === "clear") next = w.amount === "all" ? 0 : Math.max(0, marked - w.amount);
  if (w.op === "mark") next = Math.min(max, marked + (w.amount as number));
  return { marked: next, exhausted: max > 0 && next >= max, changed: next !== marked };
}

/** Once more than 6 Willpower slots are marked: -2 to all Dyad rolls per slot past the sixth */
export const willpowerPenalty = (marked: number) => (marked > 6 ? (marked - 6) * 2 : 0);
