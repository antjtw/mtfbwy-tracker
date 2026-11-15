import { PATH_BY_ID } from "./data";
import { computeHero, MAX_LEVEL, multiPathCandidates, optionsForNextLevel, tierOf, type OptionStatus } from "./engine";
import { type Derived, type Hero, type LevelEntry, type ProgressionOptionId, type ProgressionPick, SKILLS, TRAITS } from "./types";

/*
 * Level-up helpers for the screens: what a Hero can do at a given level, how to read an entry
 * back from untrusted input, and what changed once it is applied.
 */

const OPTION_IDS: readonly ProgressionOptionId[] = [
  "trait", "hp_slot", "wp_slot", "major_threshold", "minor_threshold", "path_die", "fury_damage", "fury_usage", "assess_use", "skill_tier", "weapon_proficiency", "diversify", "multi_path", "proficiency_bonus",
];

/** Problems with the Hero before any level-up: the creation choices are finished first */
export const creationIssues = (hero: Hero) => computeHero(hero).issues.filter((i) => i.level === undefined);

/** The level a Hero should work on next: the first earlier level still missing its picks or its card, otherwise the next one up */
export function levelToWorkOn(hero: Hero): number | null {
  const firstPicks = hero.levelLog.findIndex((e) => !entryComplete(e));
  const firstCard = computeHero(hero).pendingCards[0]?.level;
  const first = Math.min(firstPicks >= 0 ? firstPicks + 2 : Infinity, firstCard ?? Infinity);
  if (first !== Infinity) return first;
  const next = 1 + hero.levelLog.length + 1;
  return next > MAX_LEVEL ? null : next;
}

/** Every pick of every cost adds up to two; Diversify and Multi-path cost two on their own */
export const entryComplete = (e: LevelEntry) => e.picks.reduce((n, p) => n + (p.optionId === "diversify" || p.optionId === "multi_path" ? 2 : 1), 0) === 2;

export interface LevelInfo {
  level: number;
  tier: 1 | 2 | 3;
  /** The Hero as it stood before this level (later levels removed) */
  base: Hero;
  existing?: LevelEntry;
  /** Where the level goes is already recorded (a rebuilt Hero), so only the picks are asked for */
  gainFixed: boolean;
  options: OptionStatus[];
  /** Archetypes already followed, which can take the level */
  followed: { pathId: string; pathName: string; archetypeId: string; archetypeName: string; level: number }[];
  /** For Diversify: archetypes you could add, per path you follow */
  diversify: { pathId: string; pathName: string; archetypes: { id: string; name: string }[] }[];
  multiPath: ReturnType<typeof multiPathCandidates>;
}

export function levelInfo(hero: Hero, level: number): LevelInfo | null {
  if (level < 2 || level > MAX_LEVEL || level > 1 + hero.levelLog.length + 1) return null;
  const base: Hero = { ...hero, levelLog: hero.levelLog.slice(0, level - 2) };
  const d = computeHero(base);
  const existing = hero.levelLog[level - 2];
  const followed = d.paths.flatMap((p) =>
    p.archetypes.map((a) => ({
      pathId: p.pathId,
      pathName: PATH_BY_ID[p.pathId]?.name ?? p.pathId,
      archetypeId: a.archetypeId,
      archetypeName: PATH_BY_ID[p.pathId]?.archetypes.find((x) => x.id === a.archetypeId)?.name ?? a.archetypeId,
      level: a.level,
    })),
  );
  const diversify = d.paths.map((p) => ({
    pathId: p.pathId,
    pathName: PATH_BY_ID[p.pathId]?.name ?? p.pathId,
    archetypes: (PATH_BY_ID[p.pathId]?.archetypes ?? []).filter((a) => !a.locked && !p.archetypes.some((x) => x.archetypeId === a.id)).map((a) => ({ id: a.id, name: a.name })),
  }));
  return {
    level,
    tier: tierOf(level) as 1 | 2 | 3,
    base,
    existing,
    gainFixed: !!existing && !!existing.pathId && !!existing.archetypeId,
    options: optionsForNextLevel(base),
    followed,
    diversify,
    multiPath: multiPathCandidates(base),
  };
}

/**
 * The tier column a new pick of `optionId` should come from: the level's own tier if it still has a use,
 * otherwise the nearest earlier one. `taken` counts picks already chosen on this level.
 */
export function tierFor(status: OptionStatus, taken: ProgressionPick[]): 1 | 2 | 3 | null {
  const left = (col: 1 | 2 | 3) => (status.remaining.find((r) => r.tier === col)?.uses ?? 0) - taken.filter((p) => p.optionId === status.option.id && (p.tier ?? 0) === col).length;
  const cols = [...status.remaining.map((r) => r.tier)].sort((a, b) => b - a);
  return cols.find((c) => left(c) > 0) ?? null;
}

/** Rule problems that apply to this level once the entry is in place */
export function entryProblems(hero: Hero, entry: LevelEntry): string[] {
  const log = [...hero.levelLog];
  log[entry.characterLevel - 2] = entry;
  return computeHero({ ...hero, levelLog: log }).issues.filter((i) => i.level === entry.characterLevel || (i.level === undefined && i.code !== "missing" && i.code !== "choice" && i.code !== "array")).map((i) => i.message);
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max).trim() : "");

/** Reads a level entry from untrusted JSON; the engine then judges whether it is legal */
export function sanitizeEntry(raw: unknown, level: number): LevelEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  const picks: ProgressionPick[] = (Array.isArray(r.picks) ? r.picks : []).flatMap((p: any): ProgressionPick[] => {
    if (!p || typeof p !== "object" || !OPTION_IDS.includes(p.optionId)) return [];
    const out: ProgressionPick = { optionId: p.optionId };
    if (p.tier === 1 || p.tier === 2 || p.tier === 3) out.tier = p.tier;
    if (TRAITS.includes(p.trait)) out.trait = p.trait;
    if (SKILLS.some((s) => s.name === p.skill)) out.skill = p.skill;
    if (p.archetypeId) out.archetypeId = str(p.archetypeId, 60);
    if (p.pathId) out.pathId = str(p.pathId, 60);
    if (p.text) out.text = str(p.text, 80);
    return [out];
  }).slice(0, 2);
  return { characterLevel: level, pathId: str(r.pathId, 60), archetypeId: str(r.archetypeId, 60), picks, ...(r.cardId ? { cardId: str(r.cardId, 120) } : {}) };
}

export interface Change {
  label: string;
  from?: string;
  to: string;
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** A readable list of what the level changes */
export function changesBetween(before: Derived, after: Derived): Change[] {
  const out: Change[] = [];
  const row = (label: string, a: number | string, b: number | string, fmt: (x: any) => string = String) => {
    if (a !== b) out.push({ label, from: fmt(a), to: fmt(b) });
  };
  row("Level", before.characterLevel, after.characterLevel);
  for (const t of TRAITS) row(t, before.traits[t], after.traits[t], sign);
  row("Proficiency bonus", before.proficiencyBonus, after.proficiencyBonus, sign);
  row("Hit Point slots", before.slots.hp, after.slots.hp);
  row("Willpower slots", before.slots.willpower, after.slots.willpower);
  row("Minor threshold", before.thresholds.minor, after.thresholds.minor);
  row("Major threshold", before.thresholds.major, after.thresholds.major);
  row("Severe threshold", before.thresholds.severe, after.thresholds.severe);
  row("Massive threshold", before.thresholds.massive, after.thresholds.massive);
  for (const s of after.skills) {
    const b = before.skills.find((x) => x.skill === s.skill)!;
    if (b.step !== s.step) out.push({ label: s.skill, from: ["Untrained", "Trained", "Proficient", "Expertise"][b.step], to: ["Untrained", "Trained", "Proficient", "Expertise"][s.step] });
  }
  for (const a of after.resources) {
    const b = before.resources.find((x) => x.pathId === a.pathId);
    if (b?.text !== a.text) out.push({ label: PATH_BY_ID[a.pathId]?.name ?? a.pathId, from: b?.text, to: a.text });
  }
  const had = new Set(before.features.map((f) => f.name));
  for (const f of after.features) if (!had.has(f.name)) out.push({ label: "New feature", to: f.name });
  for (const w of after.weaponProficiencies) if (!before.weaponProficiencies.includes(w)) out.push({ label: "Weapon proficiency", to: w });
  for (const p of after.paths) {
    const b = before.paths.find((x) => x.pathId === p.pathId);
    const name = PATH_BY_ID[p.pathId]?.name ?? p.pathId;
    for (const a of p.archetypes) {
      const prev = b?.archetypes.find((x) => x.archetypeId === a.archetypeId)?.level ?? 0;
      if (prev !== a.level) out.push({ label: `${name}, ${PATH_BY_ID[p.pathId]?.archetypes.find((x) => x.id === a.archetypeId)?.name ?? a.archetypeId}`, from: prev ? `level ${prev}` : "new", to: `level ${a.level}` });
    }
  }
  return out;
}
