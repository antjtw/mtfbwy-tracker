import type { Character } from "./types";

/** Hit point slots marked by each kind of damage */
export const DAMAGE_SEVERITIES = [
  { key: "minor", label: "Minor", cost: 1 },
  { key: "major", label: "Major", cost: 2 },
  { key: "severe", label: "Severe", cost: 3 },
  { key: "massive", label: "Massive", cost: 4 },
] as const;

export type Severity = (typeof DAMAGE_SEVERITIES)[number]["key"];

/** Placeholders for every character until thresholds can be edited per character (Minor 1, Major 4) */
const DEFAULT_MINOR = 1;
const DEFAULT_MAJOR = 4;

/**
 * The damage numbers for a character: Minor and Major are set on their own, Severe is double Major and
 * Massive is double Severe. Taking twice the Massive number in one hit is instant death.
 */
export function damageThresholds(_ch?: Pick<Character, "id">): Record<Severity, number> {
  const major = DEFAULT_MAJOR;
  return { minor: DEFAULT_MINOR, major, severe: major * 2, massive: major * 4 };
}

/** Marks the next slots up to the unlocked maximum, never beyond it. */
export function applyDamage(used: number, max: number, severity: Severity) {
  const cost = DAMAGE_SEVERITIES.find((s) => s.key === severity)!.cost;
  const next = Math.min(max, used + cost);
  return { used: next, marked: next - used, remaining: max - next };
}
