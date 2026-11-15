/*
 * Character builder domain model (spec v0.1, rules v1.2.0).
 * A Hero is the small set of decisions a player makes; everything else (modifiers, slots,
 * thresholds, proficiencies) is computed from it by engine.ts and never stored.
 */

export type Trait = "STR" | "AGI" | "RES" | "FOR" | "INT" | "PRE";

export const TRAITS: readonly Trait[] = ["STR", "AGI", "RES", "FOR", "INT", "PRE"];

export const TRAIT_NAMES: Record<Trait, string> = {
  STR: "Strength",
  AGI: "Agility",
  RES: "Resilience",
  FOR: "Force",
  INT: "Intelligence",
  PRE: "Presence",
};

export const SKILLS = [
  { name: "Animal Handling", trait: "INT" },
  { name: "Astrogation", trait: "INT" },
  { name: "Athletics", trait: "STR" },
  { name: "Coercion", trait: "STR" },
  { name: "Coordination", trait: "AGI" },
  { name: "Deception", trait: "PRE" },
  { name: "History", trait: "INT" },
  { name: "Insight", trait: "PRE" },
  { name: "Investigation", trait: "INT" },
  { name: "Medicine", trait: "INT" },
  { name: "Negotiation", trait: "PRE" },
  { name: "Perception", trait: "PRE" },
  { name: "Piloting", trait: "INT" },
  { name: "Religion", trait: "FOR" },
  { name: "Skulduggery", trait: "AGI" },
  { name: "Stealth", trait: "AGI" },
  { name: "Survival", trait: "PRE" },
  { name: "Technology", trait: "INT" },
] as const satisfies readonly { name: string; trait: Trait }[];

export type SkillName = (typeof SKILLS)[number]["name"];

export type Tradition = "force" | "magick" | "tech";

/** Something a source gives a Hero outright */
export type Grant =
  | { type: "trait_increase"; trait: Trait; amount: number }
  | { type: "skill_proficiency"; skill: SkillName }
  | { type: "saving_roll_proficiency"; trait: Trait }
  | { type: "threshold_bonus"; band: "minor" | "major"; amount: number }
  | { type: "slot_change"; resource: "hp" | "willpower"; amount: number }
  | { type: "evasion_bonus"; amount: number }
  | { type: "power_access"; tradition: Tradition }
  | { type: "feature"; name: string; text?: string };

/** A decision the player must make for a source. The answer is stored in Hero.choices under `${sourceId}.${id}`. */
export type Choice =
  /** Pick `n` skills (from `options`, or any skill when omitted) */
  | { id: string; label: string; kind: "skill"; n: number; options?: readonly SkillName[] }
  /** Pick one trait to raise (from `options`, or any trait when omitted) */
  | { id: string; label: string; kind: "trait"; amount: number; options?: readonly Trait[] }
  /** Pick one bundle of grants */
  | { id: string; label: string; kind: "bundle"; options: readonly { id: string; label: string; grants: readonly Grant[] }[] }
  /** Free text the engine doesn't use (a language, an instrument, a toolkit) */
  | { id: string; label: string; kind: "text" };

export interface Source {
  id: string;
  name: string;
  summary?: string;
  grants: readonly Grant[];
  choices: readonly Choice[];
  /** Rules entry stamp, e.g. "21 Oct 2026" */
  lastUpdated?: string;
}

export interface Species extends Source {
  /** Species damage threshold; Major threshold = this + RES */
  threshold: number;
  /** A species block that must be refined (Aqualish kind, Human ancestry ...) */
  subspeciesLabel?: string;
  subspecies?: readonly Source[];
  /** Anything in the entry the engine doesn't model yet */
  notes?: readonly string[];
}

export interface Origin extends Source {}

export type CastingKind = "Force casting" | "Magick casting" | "Tech casting" | "Faith" | "Assess";

export interface Archetype {
  id: string;
  name: string;
  /** Hidden in the builder (locked or unreleased) */
  locked?: boolean;
}

export interface PathDef {
  id: string;
  name: string;
  traits: readonly [Trait, Trait];
  skillOptions: readonly SkillName[];
  saves: readonly [Trait, Trait];
  weaponProficiency: string;
  minorThresholdBonus: number;
  casting?: { kind: CastingKind; trait: Trait; tradition?: Tradition };
  /** Basic powers granted by the foundation, if any */
  basicPowers?: Tradition;
  /** Path die / resource shown on the sheet */
  resource: { kind: "die"; name: string } | { kind: "fury" } | { kind: "assess" } | { kind: "none" };
  archetypes: readonly Archetype[];
}

export interface Career extends Source {
  /** Jedi careers add one Tier 0 Force power when the Force came from your Origin or Path (rules 5.7) */
  extraTier0Force?: boolean;
  /** What the career lets you choose to carry, as a filter (R-EQ-2) */
  equipment: string;
  fixedKit: readonly string[];
  pack: string;
  tool: string;
  notes?: string;
}

export type ProgressionOptionId =
  | "trait"
  | "hp_slot"
  | "wp_slot"
  | "major_threshold"
  | "minor_threshold"
  | "path_die"
  | "fury_damage"
  | "fury_usage"
  | "assess_use"
  | "skill_tier"
  | "weapon_proficiency"
  | "diversify"
  | "multi_path"
  | "proficiency_bonus";

export interface ProgressionOption {
  id: ProgressionOptionId;
  label: string;
  /** 1 = costs one of the level's two picks, 2 = uses both */
  cost: 1 | 2;
  /** Uses available per tier column (index 0 = Tier 1); 0 means not offered in that column */
  uses: readonly [number, number, number];
}

export interface Hero {
  rulesVersion: string;
  startingLevel: number;
  species: { id: string; subspeciesId?: string };
  origin: { id: string };
  path: { id: string; archetypeId: string };
  career: { id: string };
  /** The array +2, +1, +1, +0, +0, -1 spread over the traits */
  traitArray: Record<Trait, number>;
  /** Answers to Source choices, keyed `${sourceId}.${choiceId}`; skills are arrays, trait picks strings, text strings */
  choices: Record<string, string | string[]>;
  levelLog: LevelEntry[];
  identity: { name: string; backstory: string; languages: string; notes: string };
  /** Set on Heroes rebuilt from the tracker's records: their decisions are only partly known */
  imported?: boolean;
  /** Play state kept with the Hero: which once-per abilities and uses are spent. Never an input to the rules. */
  play?: { used: Record<string, number> };
}

export interface ProgressionPick {
  optionId: ProgressionOptionId;
  /** Which tier column the pick is taken from (defaults to the tier of the level) */
  tier?: 1 | 2 | 3;
  trait?: Trait;
  skill?: SkillName;
  /** Diversify: the new Archetype */
  archetypeId?: string;
  /** Multi-path: the new Path and Archetype */
  pathId?: string;
  text?: string;
}

export interface LevelEntry {
  characterLevel: number;
  /** Path and Archetype that gain this level (ignored for Multi-path, which names its own) */
  pathId: string;
  archetypeId: string;
  picks: ProgressionPick[];
  cardId?: string;
}

export type Issue = { code: string; message: string; level?: number };

export interface LedgerRow {
  source: string;
  amount: number;
  /** Character level it came from (1 for creation) */
  level: number;
}

export type ProficiencyStep = 0 | 1 | 2 | 3;
export const STEP_NAMES = ["Untrained", "Trained", "Proficient", "Expertise"] as const;

export interface SkillState {
  skill: SkillName;
  trait: Trait;
  step: ProficiencyStep;
  modifier: number;
  sources: string[];
}

export interface PathProgress {
  pathId: string;
  level: number;
  archetypes: { archetypeId: string; level: number }[];
  /** True for the Path the Hero began with */
  began: boolean;
}

export interface PendingCard {
  level: number;
  pathId: string;
  archetypeId: string;
  archetypeLevel: number;
}

export interface Derived {
  characterLevel: number;
  tier: 0 | 1 | 2 | 3;
  proficiencyBonus: number;
  proficiencyLedger: LedgerRow[];
  traitLedger: Record<Trait, LedgerRow[]>;
  traits: Record<Trait, number>;
  skills: SkillState[];
  saves: { trait: Trait; proficient: boolean; modifier: number }[];
  thresholds: { minor: number; major: number; severe: number; massive: number };
  slots: { hp: number; willpower: number };
  evasion: number;
  casting: { kind: CastingKind; modifier: number; pathId: string }[];
  paths: PathProgress[];
  /** Per Path: the die count, Fury or Assess uses at its current level */
  resources: { pathId: string; text: string; kind?: "die" | "fury" | "assess"; count: number; name: string; extra: number }[];
  features: { name: string; source: string; text?: string }[];
  powers: { traditions: Tradition[]; extraTier0Force: number };
  weaponProficiencies: string[];
  /** Levels where a card is due and hasn't been chosen yet */
  pendingCards: PendingCard[];
  issues: Issue[];
}

export const RULES_VERSION = "1.2.0";

// ---------------------------------------------------------------- cards

export type CardSourceType = "tradition" | "path" | "career";

/** What a card needs before it can be taken */
export type CardPrerequisite =
  | { kind: "casting"; tradition: Tradition }
  | { kind: "path_feature"; name: string }
  | { kind: "archetype_feature"; name: string; featureKey: string }
  | { kind: "card"; name: string; cardId: string }
  | { kind: "unresolved"; text: string };

/** One row of the Abilities sheet, normalised (spec 3.2). Keyed by (path, archetype, name): names repeat across Paths. */
export interface Card {
  id: string;
  sourceType: CardSourceType;
  /** "Force casting", "Devout", "Bounty Hunter" ... */
  sourceName: string;
  /** Path name for Path cards; empty for casting traditions */
  path: string;
  archetype: string;
  tier: 0 | 1 | 2 | 3;
  name: string;
  content: string;
  prerequisiteText: string;
  prerequisite?: CardPrerequisite;
  actionRoll: "Yes" | "No" | "Conditional";
  /** The leading number of the cost, when the cost is a plain number; the full text is always kept */
  willpowerCost: number | null;
  willpowerCostText: string;
  sort: number;
}
