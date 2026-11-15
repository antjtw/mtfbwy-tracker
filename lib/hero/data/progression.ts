import type { ProgressionOption, ProgressionOptionId } from "../types";

/**
 * Path progression options per Path (spec 9.4, checked against each Path's own table in rules v1.2.0).
 * `uses` is per tier column; 0 means the column doesn't offer it. Diversify and Multi-path also need character level 5+.
 */

type Uses = readonly [number, number, number];

const common = (minor: Uses): Partial<Record<ProgressionOptionId, Uses>> => ({
  trait: [2, 2, 2],
  hp_slot: [2, 2, 2],
  wp_slot: [2, 2, 2],
  major_threshold: [2, 2, 2],
  minor_threshold: minor,
  diversify: [1, 1, 1],
  proficiency_bonus: [0, 1, 1],
  multi_path: [0, 1, 1],
});

const BY_PATH: Record<string, Partial<Record<ProgressionOptionId, Uses>>> = {
  devout: { ...common([1, 2, 2]), path_die: [1, 1, 1] },
  marauder: { ...common([2, 2, 2]), fury_damage: [1, 1, 1], fury_usage: [1, 1, 1] },
  mystic: { ...common([1, 1, 1]), path_die: [1, 1, 1] },
  sentinel: { ...common([1, 1, 1]), path_die: [1, 1, 1] },
  sorcerer: { ...common([1, 1, 1]), path_die: [1, 1, 1] },
  technologist: { ...common([1, 1, 1]), path_die: [1, 1, 1] },
  vanguard: { ...common([1, 1, 1]), assess_use: [2, 2, 2] },
  wayfarer: { ...common([1, 1, 1]), skill_tier: [2, 0, 0], weapon_proficiency: [0, 1, 1] },
};

const LABELS: Record<ProgressionOptionId, { label: string; cost: 1 | 2 }> = {
  trait: { label: "Increase any trait by +1", cost: 1 },
  hp_slot: { label: "Add one Hit Point slot", cost: 1 },
  wp_slot: { label: "Add one Willpower slot", cost: 1 },
  major_threshold: { label: "Increase your Major damage threshold by +1", cost: 1 },
  minor_threshold: { label: "Increase your Minor damage threshold by +1", cost: 1 },
  path_die: { label: "Add one extra Path die", cost: 1 },
  fury_damage: { label: "Increase Fury damage by +1", cost: 1 },
  fury_usage: { label: "Gain one extra Fury use", cost: 1 },
  assess_use: { label: "Gain one extra Assess use", cost: 1 },
  skill_tier: { label: "Increase your proficiency tier in one skill", cost: 1 },
  weapon_proficiency: { label: "Add one new weapon proficiency", cost: 1 },
  diversify: { label: "Diversify: take up a second Archetype in your Path", cost: 2 },
  multi_path: { label: "Multi-path: begin a new Path", cost: 2 },
  proficiency_bonus: { label: "Add +1 to your proficiency bonus", cost: 1 },
};

/** Option order as the rules table lists them */
const ORDER: ProgressionOptionId[] = [
  "trait",
  "hp_slot",
  "wp_slot",
  "major_threshold",
  "minor_threshold",
  "path_die",
  "fury_damage",
  "fury_usage",
  "assess_use",
  "skill_tier",
  "weapon_proficiency",
  "proficiency_bonus",
  "diversify",
  "multi_path",
];

/** The options offered by the Path a Hero began with */
export function progressionFor(pathId: string): ProgressionOption[] {
  const uses = BY_PATH[pathId] ?? {};
  return ORDER.filter((id) => uses[id]).map((id) => ({ id, ...LABELS[id], uses: uses[id]! }));
}

/** The first character level that can take Diversify or Multi-path */
export const BRANCH_FROM_LEVEL = 5;
