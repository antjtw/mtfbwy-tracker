import { ARCHETYPE_FEATURES, archetypeKey, BRANCH_FROM_LEVEL, CAREER_BY_ID, ORIGIN_BY_ID, PATH_BY_ID, progressionFor, SPECIES_BY_ID } from "./data";
import {
  type Career,
  type Choice,
  type Derived,
  type Grant,
  type Hero,
  type Issue,
  type LedgerRow,
  type LevelEntry,
  type PathDef,
  type PathProgress,
  type PendingCard,
  type ProficiencyStep,
  type ProgressionOption,
  type ProgressionPick,
  RULES_VERSION,
  type SkillName,
  SKILLS,
  type Source,
  type Tradition,
  type Trait,
  TRAITS,
} from "./types";

/*
 * The rules engine: pure functions from a Hero to its derived stats and any rule problems.
 * Rule IDs in comments (R-...) refer to the builder spec.
 */

export const MAX_LEVEL = 12;
export const TRAIT_CAP = 7; // R-TR-3 / D10
export const SLOT_CAP = 12;
export const CARD_LEVELS: readonly number[] = [2, 3, 4, 6, 7, 8, 10, 11, 12];

export const STARTING_ARRAY: readonly number[] = [2, 1, 1, 0, 0, -1];

export const tierOf = (level: number): 0 | 1 | 2 | 3 => (level <= 1 ? 0 : level <= 4 ? 1 : level <= 8 ? 2 : 3);

/** R-LVL-4 / D16: +2 (levels 1 to 4), +3 (5 to 8), +4 (9 to 12) */
export const baseProficiency = (level: number) => (level <= 4 ? 2 : level <= 8 ? 3 : 4);

/** Key under which a choice's answer is stored in Hero.choices */
export const choiceKey = (sourceKey: string, choiceId: string) => `${sourceKey}.${choiceId}`;

export const speciesKey = (id: string) => `species:${id}`;
export const subspeciesKey = (speciesId: string, id: string) => `subspecies:${speciesId}/${id}`;
export const originKey = (id: string) => `origin:${id}`;
export const careerKey = (id: string) => `career:${id}`;
export const pathKey = (id: string) => `path:${id}`;

export function emptyHero(): Hero {
  return {
    rulesVersion: RULES_VERSION,
    startingLevel: 1,
    species: { id: "" },
    origin: { id: "" },
    path: { id: "", archetypeId: "" },
    career: { id: "" },
    traitArray: { STR: 0, AGI: 0, RES: 0, FOR: 0, INT: 0, PRE: 0 },
    choices: {},
    levelLog: [],
    identity: { name: "", backstory: "", languages: "", notes: "" },
  };
}

/** R-TR-1: the array must be used exactly once, in any order */
export function validateTraitArray(arr: Record<Trait, number>): boolean {
  const got = TRAITS.map((t) => arr[t]).sort((a, b) => a - b);
  const want = [...STARTING_ARRAY].sort((a, b) => a - b);
  return got.length === want.length && got.every((v, i) => v === want[i]);
}

// ---------------------------------------------------------------- choices

function asArray(v: string | string[] | undefined): string[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}

/** Turns a source's answered choices into grants, noting anything unanswered or invalid */
function resolveChoices(sourceKey: string, label: string, choices: readonly Choice[], hero: Hero, issues: Issue[]): Grant[] {
  const grants: Grant[] = [];
  for (const c of choices) {
    const answer = hero.choices[choiceKey(sourceKey, c.id)];
    if (c.kind === "text") continue; // recorded, not used by the engine
    if (c.kind === "skill") {
      const picked = asArray(answer);
      const bad = picked.filter((s) => !(c.options ?? SKILLS.map((x) => x.name)).includes(s as SkillName));
      if (picked.length !== c.n || bad.length || new Set(picked).size !== picked.length) {
        issues.push({ code: "choice", message: `${label}: ${c.label}` });
      }
      for (const s of picked) if (!bad.includes(s)) grants.push({ type: "skill_proficiency", skill: s as SkillName });
    } else if (c.kind === "trait") {
      const trait = asArray(answer)[0] as Trait | undefined;
      if (!trait || !TRAITS.includes(trait) || (c.options && !c.options.includes(trait))) {
        issues.push({ code: "choice", message: `${label}: ${c.label}` });
      } else grants.push({ type: "trait_increase", trait, amount: c.amount });
    } else {
      const opt = c.options.find((o) => o.id === asArray(answer)[0]);
      if (!opt) issues.push({ code: "choice", message: `${label}: ${c.label}` });
      else grants.push(...opt.grants);
    }
  }
  return grants;
}

// ---------------------------------------------------------------- the build

interface Built {
  derived: Derived;
}

const ordinalTier = (t: 0 | 1 | 2 | 3): 1 | 2 | 3 => (t === 0 ? 1 : t);

/** Computes everything for a Hero as it stands after `log` (levels 2 and up) */
function build(hero: Hero, log: readonly LevelEntry[]): Built {
  const issues: Issue[] = [];
  const species = SPECIES_BY_ID[hero.species.id];
  const origin = ORIGIN_BY_ID[hero.origin.id];
  const path = PATH_BY_ID[hero.path.id];
  const career = CAREER_BY_ID[hero.career.id];
  const characterLevel = 1 + log.length;
  const tier = tierOf(characterLevel);

  if (!species) issues.push({ code: "missing", message: "Choose a species" });
  if (!origin) issues.push({ code: "missing", message: "Choose an origin" });
  if (!path) issues.push({ code: "missing", message: "Choose a path" });
  if (path && !path.archetypes.some((a) => a.id === hero.path.archetypeId && !a.locked)) {
    issues.push({ code: "missing", message: "Choose an archetype" });
  }
  if (!career) issues.push({ code: "missing", message: "Choose a career" });

  const subspecies = species?.subspecies?.find((s) => s.id === hero.species.subspeciesId);
  if (species?.subspecies && !subspecies) issues.push({ code: "missing", message: `Choose ${species.subspeciesLabel?.toLowerCase() ?? "a kind"}` });

  // ---- Grants from each source, in the order skills are applied
  type Keyed = { key: string; name: string; source: Source | Career | undefined };
  const keyed: Keyed[] = [
    { key: species ? speciesKey(species.id) : "", name: species?.name ?? "", source: species },
    { key: species && subspecies ? subspeciesKey(species.id, subspecies.id) : "", name: subspecies?.name ?? "", source: subspecies },
    { key: origin ? originKey(origin.id) : "", name: origin?.name ?? "", source: origin },
  ];
  const careerKeyed: Keyed = { key: career ? careerKey(career.id) : "", name: career?.name ?? "", source: career };

  const grantsBy = new Map<string, Grant[]>();
  for (const k of [...keyed, careerKeyed]) {
    if (!k.source) continue;
    grantsBy.set(k.key, [...k.source.grants, ...resolveChoices(k.key, k.name, k.source.choices, hero, issues)]);
  }

  // Path: 2 skills from its list (R-SK-1), plus its saves and foundation
  const pathSkills = path ? asArray(hero.choices[choiceKey(pathKey(path.id), "skills")]) : [];
  if (path) {
    const bad = pathSkills.filter((s) => !path.skillOptions.includes(s as SkillName));
    if (pathSkills.length !== 2 || bad.length || new Set(pathSkills).size !== 2) {
      issues.push({ code: "choice", message: `${path.name}: choose 2 skills` });
    }
  }

  // ---- Trait ledger
  const traitLedger = Object.fromEntries(TRAITS.map((t) => [t, [] as LedgerRow[]])) as Record<Trait, LedgerRow[]>;
  if (!validateTraitArray(hero.traitArray)) issues.push({ code: "array", message: "Use each value in the starting array once" });
  for (const t of TRAITS) traitLedger[t].push({ source: "Starting array", amount: hero.traitArray[t], level: 1 });
  for (const k of [...keyed, careerKeyed]) {
    for (const g of grantsBy.get(k.key) ?? []) {
      if (g.type === "trait_increase") traitLedger[g.trait].push({ source: k.name, amount: g.amount, level: 1 });
    }
  }

  // ---- Level log: progression picks, Path and Archetype levels
  const paths: PathProgress[] = [];
  if (path && hero.path.archetypeId) {
    paths.push({ pathId: path.id, level: 1, archetypes: [{ archetypeId: hero.path.archetypeId, level: 1 }], began: true });
  }
  const pbLedger: LedgerRow[] = [{ source: `Level ${characterLevel}`, amount: baseProficiency(characterLevel), level: characterLevel }];
  const picked = {
    hp: 0, wp: 0, major: 0, minor: 0, die: 0, furyDamage: 0, furyUsage: 0, assess: 0,
  };
  const skillTierUps: SkillName[] = [];
  const weaponProficiencies: string[] = path ? [path.weaponProficiency] : [];
  const pendingCards: PendingCard[] = [];
  const used = new Map<string, number>(); // `${option}:${tier}` -> picks so far
  const options = path ? progressionFor(path.id) : [];

  log.forEach((entry, i) => {
    const level = i + 2;
    const entryTier = ordinalTier(tierOf(level));
    const fail = (message: string) => issues.push({ code: "level", message, level });
    if (entry.characterLevel !== level) fail(`Level ${level}: out of sequence`);

    const cost = entry.picks.reduce((n, p) => n + (options.find((o) => o.id === p.optionId)?.cost ?? 1), 0);
    if (cost !== 2) fail(`Level ${level}: choose two options`);

    let branched: "diversify" | "multi_path" | null = null;
    for (const p of entry.picks) {
      const opt = options.find((o) => o.id === p.optionId);
      if (!opt) {
        fail(`Level ${level}: ${p.optionId} isn't offered by ${path?.name ?? "your path"}`);
        continue;
      }
      const col = p.tier ?? entryTier;
      if (col < 1 || col > entryTier) fail(`Level ${level}: ${opt.label} can't come from Tier ${col}`);
      else if (opt.uses[col - 1] === 0) fail(`Level ${level}: ${opt.label} isn't offered in Tier ${col}`);
      else {
        const k = `${opt.id}:${col}`;
        used.set(k, (used.get(k) ?? 0) + 1);
        if ((used.get(k) ?? 0) > opt.uses[col - 1]) fail(`Level ${level}: ${opt.label} is used up for Tier ${col}`);
      }
      applyPick(p, opt);
    }

    function applyPick(p: ProgressionPick, opt: ProgressionOption) {
      switch (p.optionId) {
        case "trait":
          if (!p.trait || !TRAITS.includes(p.trait)) fail(`Level ${level}: choose which trait to raise`);
          else traitLedger[p.trait].push({ source: `Level ${level} progression`, amount: 1, level });
          break;
        case "hp_slot": picked.hp++; break;
        case "wp_slot": picked.wp++; break;
        case "major_threshold": picked.major++; break;
        case "minor_threshold": picked.minor++; break;
        case "path_die": picked.die++; break;
        case "fury_damage": picked.furyDamage++; break;
        case "fury_usage": picked.furyUsage++; break;
        case "assess_use": picked.assess++; break;
        case "proficiency_bonus":
          pbLedger.push({ source: `Level ${level} progression`, amount: 1, level });
          break;
        case "skill_tier":
          if (!p.skill) fail(`Level ${level}: choose which skill to raise`);
          else skillTierUps.push(p.skill);
          break;
        case "weapon_proficiency":
          if (!p.text?.trim()) fail(`Level ${level}: name the weapon proficiency`);
          else weaponProficiencies.push(p.text.trim());
          break;
        case "diversify":
        case "multi_path":
          if (level < BRANCH_FROM_LEVEL) fail(`Level ${level}: ${opt.label} is available from level ${BRANCH_FROM_LEVEL}`);
          branched = p.optionId;
          break;
      }
    }

    // ---- Which Archetype gains the level
    const gain = (pathId: string, archetypeId: string) => {
      let pp = paths.find((x) => x.pathId === pathId);
      if (!pp) {
        pp = { pathId, level: 0, archetypes: [], began: false };
        paths.push(pp);
      }
      let a = pp.archetypes.find((x) => x.archetypeId === archetypeId);
      if (!a) {
        a = { archetypeId, level: 0 };
        pp.archetypes.push(a);
      }
      pp.level++;
      a.level++;
      if (CARD_LEVELS.includes(a.level) && !entry.cardId) pendingCards.push({ level, pathId, archetypeId, archetypeLevel: a.level });
    };

    if (branched === "multi_path") {
      const pick = entry.picks.find((p) => p.optionId === "multi_path")!;
      const newPath = PATH_BY_ID[pick.pathId ?? ""];
      if (!newPath) fail(`Level ${level}: choose a new path`);
      else if (paths.some((x) => x.pathId === newPath.id)) fail(`Level ${level}: you already follow ${newPath.name}`);
      else if (!newPath.archetypes.some((a) => a.id === pick.archetypeId && !a.locked)) fail(`Level ${level}: choose an archetype for ${newPath.name}`);
      else {
        // D7: +1 or higher in both of the new Path's traits, as they stood before this level's picks (R-LOOP-3)
        const before = build(hero, log.slice(0, i)).derived.traits;
        if (newPath.traits.some((t) => before[t] < 1)) {
          fail(`Level ${level}: ${newPath.name} needs +1 or more in ${newPath.traits.join(" and ")}`);
        }
        gain(newPath.id, pick.archetypeId!);
      }
    } else if (branched === "diversify") {
      const pp = paths.find((x) => x.pathId === entry.pathId);
      const def = PATH_BY_ID[entry.pathId];
      if (!pp || !def) fail(`Level ${level}: choose a path to diversify in`);
      else if (!def.archetypes.some((a) => a.id === entry.archetypeId && !a.locked)) fail(`Level ${level}: choose an archetype in ${def.name}`);
      else if (pp.archetypes.some((a) => a.archetypeId === entry.archetypeId)) fail(`Level ${level}: you already follow that archetype`);
      else gain(pp.pathId, entry.archetypeId);
    } else {
      const pp = paths.find((x) => x.pathId === entry.pathId);
      if (!pp || !pp.archetypes.some((a) => a.archetypeId === entry.archetypeId)) fail(`Level ${level}: choose an archetype you follow`);
      else gain(entry.pathId, entry.archetypeId);
    }
  });

  // ---- Slots (R-LVL / 5.3)
  const slotGrants = (resource: "hp" | "willpower") =>
    [...keyed, careerKeyed].flatMap((k) => grantsBy.get(k.key) ?? []).reduce((n, g) => (g.type === "slot_change" && g.resource === resource ? n + g.amount : n), 0);
  const hp = 6 + slotGrants("hp") + picked.hp;
  const willpower = 6 + slotGrants("willpower") + picked.wp;
  if (hp > SLOT_CAP) issues.push({ code: "slots", message: `Hit Point slots are capped at ${SLOT_CAP}` });
  if (willpower > SLOT_CAP) issues.push({ code: "slots", message: `Willpower slots are capped at ${SLOT_CAP}` });

  // ---- Proficiency bonus
  const proficiencyBonus = pbLedger.reduce((n, r) => n + r.amount, 0);

  // ---- Traits
  const traits = Object.fromEntries(TRAITS.map((t) => [t, traitLedger[t].reduce((n, r) => n + r.amount, 0)])) as Record<Trait, number>;
  for (const t of TRAITS) if (traits[t] > TRAIT_CAP) issues.push({ code: "trait_cap", message: `${t} can't go above +${TRAIT_CAP}` });

  // ---- Skills (R-SK-*, D5)
  const steps = new Map<SkillName, { step: ProficiencyStep; sources: string[] }>();
  const grantSkill = (skill: SkillName, source: string, expertiseIfHeld: boolean) => {
    const cur = steps.get(skill);
    if (!cur) steps.set(skill, { step: 2, sources: [source] });
    else if (expertiseIfHeld && cur.step < 3) steps.set(skill, { step: 3, sources: [...cur.sources, source] });
    else cur.sources.push(`${source} (already proficient)`);
  };
  for (const k of keyed) for (const g of grantsBy.get(k.key) ?? []) if (g.type === "skill_proficiency") grantSkill(g.skill, k.name, false);
  if (path) for (const s of pathSkills) if (path.skillOptions.includes(s as SkillName)) grantSkill(s as SkillName, path.name, false);
  for (const g of grantsBy.get(careerKeyed.key) ?? []) if (g.type === "skill_proficiency") grantSkill(g.skill, careerKeyed.name, true); // D5: career converts a duplicate to Expertise
  // Lifeline's Patch Up (R-SK-4): Medicine, Expertise if already proficient
  for (const p of paths) {
    if (p.pathId === "vanguard" && p.archetypes.some((a) => a.archetypeId === "lifeline")) grantSkill("Medicine", "Patch Up", true);
  }
  for (const s of skillTierUps) {
    const cur = steps.get(s) ?? { step: 0 as ProficiencyStep, sources: [] };
    steps.set(s, { step: Math.min(3, cur.step + 1) as ProficiencyStep, sources: [...cur.sources, "Skill tier increase"] });
  }
  const stepBonus = (step: ProficiencyStep) => [0, Math.floor(proficiencyBonus / 2), proficiencyBonus, proficiencyBonus * 2][step];
  const skills = SKILLS.map(({ name, trait }) => {
    const st = steps.get(name) ?? { step: 0 as ProficiencyStep, sources: [] };
    return { skill: name, trait, step: st.step, modifier: traits[trait] + stepBonus(st.step), sources: st.sources };
  });

  // ---- Saves: the Path you began with (R-SK-5); a Multi-path never adds saves
  const saves = TRAITS.map((trait) => {
    const proficient = !!path && path.saves.includes(trait);
    return { trait, proficient, modifier: traits[trait] + (proficient ? proficiencyBonus : 0) };
  });

  // ---- Thresholds (5.3)
  const grantedThreshold = (band: "minor" | "major") =>
    [...keyed, careerKeyed].flatMap((k) => grantsBy.get(k.key) ?? []).reduce((n, g) => (g.type === "threshold_bonus" && g.band === band ? n + g.amount : n), 0);
  const minor = 1 + (path?.minorThresholdBonus ?? 0) + picked.minor + grantedThreshold("minor");
  const major = (species?.threshold ?? 3) + traits.RES + picked.major + grantedThreshold("major");
  const thresholds = { minor, major, severe: major * 2, massive: major * 4 };

  // ---- Evasion (armour joins when equipment is built)
  const evasion =
    12 + traits.AGI + [...keyed, careerKeyed].flatMap((k) => grantsBy.get(k.key) ?? []).reduce((n, g) => (g.type === "evasion_bonus" ? n + g.amount : n), 0);

  // ---- Casting, powers and resources
  const heldPaths = paths.map((p) => PATH_BY_ID[p.pathId]).filter(Boolean) as PathDef[];
  const casting = heldPaths
    .filter((p) => p.casting)
    .map((p) => ({ kind: p.casting!.kind, pathId: p.id, modifier: traits[p.casting!.trait] + proficiencyBonus }));

  const traditions = new Set<Tradition>();
  const originForce = (grantsBy.get(originKey(origin?.id ?? "")) ?? []).some((g) => g.type === "power_access" && g.tradition === "force");
  for (const k of [...keyed, careerKeyed]) for (const g of grantsBy.get(k.key) ?? []) if (g.type === "power_access") traditions.add(g.tradition);
  for (const p of heldPaths) if (p.basicPowers) traditions.add(p.basicPowers);
  // 5.7 / D6: extra Tier 0 Force power picks
  let extraTier0Force = 0;
  for (const p of heldPaths) if ((p.id === "mystic" || p.id === "sentinel") && originForce) extraTier0Force++;
  if (career?.extraTier0Force && (originForce || heldPaths.some((p) => p.basicPowers === "force"))) extraTier0Force++;

  const resources = paths.map((p) => {
    const def = PATH_BY_ID[p.pathId];
    const lvl = p.level;
    const steps = (lvl >= 4 ? 1 : 0) + (lvl >= 7 ? 1 : 0) + (lvl >= 10 ? 1 : 0);
    const began = p.began;
    let text = "";
    if (def?.resource.kind === "die") text = `${1 + steps + (began ? picked.die : 0)}d4 ${def.resource.name}`;
    else if (def?.resource.kind === "fury") text = `Fury +${2 + steps + (began ? picked.furyDamage : 0)} damage, ${2 + steps + (began ? picked.furyUsage : 0)} uses`;
    else if (def?.resource.kind === "assess") text = `${Math.max(1, traits.INT) + (began ? picked.assess : 0)} Assess uses per short rest`;
    return { pathId: p.pathId, text };
  }).filter((r) => r.text);

  // ---- Features
  const features: Derived["features"] = [];
  for (const k of [...keyed, careerKeyed]) for (const g of grantsBy.get(k.key) ?? []) if (g.type === "feature") features.push({ name: g.name, source: k.name, text: g.text });
  for (const p of paths) {
    for (const a of p.archetypes) {
      for (const f of ARCHETYPE_FEATURES[archetypeKey(p.pathId, a.archetypeId)] ?? []) {
        if (a.level >= f.level) features.push({ name: f.name, source: `${PATH_BY_ID[p.pathId]?.name} ${a.archetypeId.replace(/-/g, " ")}`, text: f.text });
      }
    }
  }

  const derived: Derived = {
    characterLevel,
    tier,
    proficiencyBonus,
    proficiencyLedger: pbLedger,
    traitLedger,
    traits,
    skills,
    saves,
    thresholds,
    slots: { hp: Math.min(hp, SLOT_CAP), willpower: Math.min(willpower, SLOT_CAP) },
    evasion,
    casting,
    paths,
    resources,
    features,
    powers: { traditions: [...traditions], extraTier0Force },
    weaponProficiencies,
    pendingCards,
    issues,
  };
  return { derived };
}

/** Everything computed from the Hero. Never stored. */
export function computeHero(hero: Hero): Derived {
  return build(hero, hero.levelLog).derived;
}

/** Levels where a card is due and hasn't been picked yet (cards arrive with the card data in a later phase) */
export function pendingCards(hero: Hero): PendingCard[] {
  return computeHero(hero).pendingCards;
}

// ---------------------------------------------------------------- level-up helpers for the UI

export interface OptionStatus {
  option: ProgressionOption;
  /** Picks still available from each tier column up to the next level's tier */
  remaining: { tier: 1 | 2 | 3; uses: number }[];
  available: boolean;
  reason?: string;
}

/** What the Hero can pick at their next level (R-LOOP-1), each with a reason when it can't be taken */
export function optionsForNextLevel(hero: Hero): OptionStatus[] {
  const path = PATH_BY_ID[hero.path.id];
  if (!path) return [];
  const nextLevel = 1 + hero.levelLog.length + 1;
  const tier = ordinalTier(tierOf(nextLevel));
  const used = new Map<string, number>();
  for (const e of hero.levelLog) {
    const t0 = ordinalTier(tierOf(e.characterLevel));
    for (const p of e.picks) {
      const k = `${p.optionId}:${p.tier ?? t0}`;
      used.set(k, (used.get(k) ?? 0) + 1);
    }
  }
  const derived = computeHero(hero);
  return progressionFor(path.id).map((option) => {
    const remaining = ([1, 2, 3] as const)
      .filter((c) => c <= tier && option.uses[c - 1] > 0)
      .map((c) => ({ tier: c, uses: option.uses[c - 1] - (used.get(`${option.id}:${c}`) ?? 0) }));
    let available = remaining.some((r) => r.uses > 0);
    let reason = available ? undefined : option.uses.some((u) => u > 0) ? "All uses taken for your tiers" : "Not offered by your path";
    if ((option.id === "diversify" || option.id === "multi_path") && nextLevel < BRANCH_FROM_LEVEL) {
      available = false;
      reason = `Available from level ${BRANCH_FROM_LEVEL}`;
    }
    if (available && option.id === "multi_path" && !hasOpenMultiPath(derived)) {
      available = false;
      reason = "No other path has +1 or more in both of its traits yet";
    }
    if (available && option.id === "trait" && TRAITS.every((t) => derived.traits[t] >= TRAIT_CAP)) {
      available = false;
      reason = `Every trait is at +${TRAIT_CAP}`;
    }
    if (available && option.id === "hp_slot" && derived.slots.hp >= SLOT_CAP) {
      available = false;
      reason = `Hit Point slots are at ${SLOT_CAP}`;
    }
    if (available && option.id === "wp_slot" && derived.slots.willpower >= SLOT_CAP) {
      available = false;
      reason = `Willpower slots are at ${SLOT_CAP}`;
    }
    return { option, remaining, available, reason };
  });
}

/** Paths a Hero could multi-path into: not already followed, and +1 in both traits right now (D7) */
export function multiPathCandidates(hero: Hero): { path: PathDef; eligible: boolean; reason?: string }[] {
  const d = computeHero(hero);
  return Object.values(PATH_BY_ID)
    .filter((p) => !d.paths.some((x) => x.pathId === p.id))
    .map((path) => {
      const short = path.traits.filter((t) => d.traits[t] < 1);
      return short.length
        ? { path, eligible: false, reason: `Needs +1 or more in ${short.join(" and ")} (you have ${short.map((t) => (d.traits[t] >= 0 ? `+${d.traits[t]}` : d.traits[t])).join(" and ")})` }
        : { path, eligible: true };
    });
}

function hasOpenMultiPath(d: Derived) {
  return Object.values(PATH_BY_ID).some((p) => !d.paths.some((x) => x.pathId === p.id) && p.traits.every((t) => d.traits[t] >= 1));
}
