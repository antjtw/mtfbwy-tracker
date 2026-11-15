import { describe, expect, it } from "vitest";
import { choiceKey, computeHero, emptyHero, multiPathCandidates, optionsForNextLevel, pathKey, pendingCards, speciesKey, validateTraitArray } from "./engine";
import type { Hero, LevelEntry, ProgressionPick, Trait } from "./types";

/** Builds a Hero from the decisions a player makes */
function hero(o: {
  species: string;
  sub?: string;
  origin: string;
  path: string;
  archetype: string;
  career: string;
  array: Partial<Record<Trait, number>> & Record<"STR" | "AGI" | "RES" | "FOR" | "INT" | "PRE", number>;
  skills?: string[];
  choices?: Hero["choices"];
  log?: LevelEntry[];
}): Hero {
  const h = emptyHero();
  h.species = { id: o.species, subspeciesId: o.sub };
  h.origin = { id: o.origin };
  h.path = { id: o.path, archetypeId: o.archetype };
  h.career = { id: o.career };
  h.traitArray = o.array;
  h.choices = { ...(o.skills ? { [choiceKey(pathKey(o.path), "skills")]: o.skills } : {}), ...o.choices };
  h.levelLog = o.log ?? [];
  return h;
}

const pick = (optionId: ProgressionPick["optionId"], extra: Partial<ProgressionPick> = {}): ProgressionPick => ({ optionId, ...extra });
const entry = (level: number, pathId: string, archetypeId: string, ...picks: ProgressionPick[]): LevelEntry => ({ characterLevel: level, pathId, archetypeId, picks });

// A sensible default array
const A = { STR: 1, AGI: 1, RES: 2, FOR: 0, INT: 0, PRE: -1 };

describe("creation", () => {
  it("accepts the starting array in any order, and nothing else", () => {
    expect(validateTraitArray({ STR: 2, AGI: 1, RES: 1, FOR: 0, INT: 0, PRE: -1 })).toBe(true);
    expect(validateTraitArray({ STR: -1, AGI: 0, RES: 0, FOR: 1, INT: 1, PRE: 2 })).toBe(true);
    expect(validateTraitArray({ STR: 2, AGI: 2, RES: 1, FOR: 0, INT: 0, PRE: -1 })).toBe(false);
    expect(validateTraitArray({ STR: 3, AGI: 1, RES: 1, FOR: 0, INT: 0, PRE: -1 })).toBe(false);
  });

  it("Human with an Onderonian ancestry can put both increases into Resilience", () => {
    const h = hero({
      species: "human", sub: "onderonian", origin: "prospect", path: "marauder", archetype: "tank", career: "freedom-fighter",
      array: { STR: 2, AGI: 1, RES: 1, FOR: 0, INT: 0, PRE: -1 }, skills: ["Athletics", "Coercion"],
      choices: { [choiceKey(speciesKey("human"), "any-trait")]: "RES" },
    });
    const d = computeHero(h);
    expect(d.traits.RES).toBe(3); // array +1, Human +1, Onderonian +1
    expect(d.traitLedger.RES.map((r) => r.source)).toContain("Onderonian");
    expect(d.traitLedger.RES.map((r) => r.source)).toContain("Starting array");
    expect(d.issues.filter((i) => i.code !== "choice")).toEqual([]);
  });

  it("flags unanswered choices without inventing answers", () => {
    const h = hero({ species: "human", sub: "onderonian", origin: "prospect", path: "marauder", archetype: "tank", career: "freedom-fighter", array: A, skills: ["Athletics", "Coercion"] });
    expect(computeHero(h).issues.some((i) => i.code === "choice")).toBe(true);
  });

  it("level 1 has no loop, no cards and no progression picks", () => {
    const d = computeHero(hero({ species: "bith", origin: "hardened", path: "technologist", archetype: "polestar", career: "engineer", array: A, skills: ["Piloting", "Technology"], choices: { [choiceKey(speciesKey("bith"), "instrument")]: "Flute" } }));
    expect(d.characterLevel).toBe(1);
    expect(d.tier).toBe(0);
    expect(d.proficiencyBonus).toBe(2);
    expect(pendingCards(hero({ species: "bith", origin: "hardened", path: "technologist", archetype: "polestar", career: "engineer", array: A }))).toEqual([]);
  });
});

describe("skills (D5, R-SK)", () => {
  it("a Career skill you already hold becomes Expertise", () => {
    // Rodian gives Survival; Bounty hunter gives Survival again
    const d = computeHero(hero({ species: "rodian", origin: "prospect", path: "marauder", archetype: "tank", career: "bounty-hunter", array: A, skills: ["Coercion", "Stealth"] }));
    expect(d.skills.find((s) => s.skill === "Survival")?.step).toBe(3);
    expect(d.skills.find((s) => s.skill === "Survival")?.modifier).toBe(d.traits.PRE + d.proficiencyBonus * 2);
  });

  it("the same skill from Origin and Path gives no Expertise and no error", () => {
    const d = computeHero(hero({ species: "cerean", origin: "prospect", path: "marauder", archetype: "tank", career: "freedom-fighter", array: A, skills: ["Athletics", "Coercion"] }));
    expect(d.skills.find((s) => s.skill === "Athletics")?.step).toBe(2);
    expect(d.skills.find((s) => s.skill === "Athletics")?.sources.join()).toContain("already proficient");
    expect(d.issues.filter((i) => i.code === "choice")).toEqual([]);
  });

  it("a Hero is proficient in the saves of the Path they began with", () => {
    const d = computeHero(hero({ species: "cerean", origin: "prospect", path: "sentinel", archetype: "blademaster", career: "freedom-fighter", array: A, skills: ["Athletics", "Insight"] }));
    expect(d.saves.filter((s) => s.proficient).map((s) => s.trait)).toEqual(["STR", "FOR"]);
  });
});

describe("powers (D6, 5.7)", () => {
  const force = (origin: string, path: string, archetype: string, career: string, species = "wookiee") =>
    computeHero(hero({ species, origin, path, archetype, career, array: A, skills: path === "mystic" ? ["Athletics", "Insight"] : ["Athletics", "Insight"] }));

  it("Force Sensitive Mystic Jedi Knight: Basic Force powers once, two extra Tier 0 Force picks", () => {
    const d = force("force-sensitive", "mystic", "cosmic", "jedi-knight");
    expect(d.powers.traditions.filter((t) => t === "force")).toHaveLength(1);
    expect(d.powers.extraTier0Force).toBe(2);
  });

  it("a Mystic without a Force origin who is a Jedi Knight gets one", () => {
    expect(force("hardened", "mystic", "cosmic", "jedi-knight").powers.extraTier0Force).toBe(1);
  });

  it("a Sorcerer who is Witchborn gets Basic Magick and no Force extra", () => {
    const d = computeHero(hero({ species: "human", sub: "alderaanian", origin: "witchborn", path: "sorcerer", archetype: "embalmed", career: "scholar", array: A, skills: ["Medicine", "Religion"], choices: { [choiceKey(speciesKey("human"), "any-trait")]: "FOR", [choiceKey(speciesKey("human"), "language")]: "Basic" } }));
    expect(d.powers.traditions).toEqual(["magick"]);
    expect(d.powers.extraTier0Force).toBe(0);
  });
});

describe("derived stats", () => {
  it("thresholds: Human with RES +1 has Minor 1, Major 4, Severe 8, Massive 16", () => {
    const h = hero({
      species: "human", sub: "ghorman", origin: "tribal", path: "wayfarer", archetype: "operative", career: "smuggler",
      array: { STR: 0, AGI: 2, RES: 1, FOR: 0, INT: 1, PRE: -1 }, skills: ["Deception", "Skulduggery"],
      choices: { [choiceKey(speciesKey("human"), "any-trait")]: "AGI" },
    });
    const d = computeHero(h);
    expect(d.traits.RES).toBe(1);
    expect(d.thresholds).toEqual({ minor: 1, major: 4, severe: 8, massive: 16 });
  });

  it("Devout and Marauder add +1 to the Minor threshold", () => {
    const mk = (path: string, archetype: string) => computeHero(hero({ species: "cerean", origin: "prospect", path, archetype, career: "freedom-fighter", array: A, skills: path === "devout" ? ["Athletics", "Stealth"] : ["Athletics", "Stealth"] }));
    expect(mk("devout", "guardian").thresholds.minor).toBe(2);
    expect(mk("marauder", "tank").thresholds.minor).toBe(2);
    expect(mk("sentinel", "blademaster").thresholds.minor).toBe(1);
  });

  it("a Labourer starts with 7 Hit Point slots and a Kalleran with 7 Willpower slots", () => {
    const labourer = computeHero(hero({ species: "cerean", origin: "prospect", path: "marauder", archetype: "tank", career: "labourer", array: A, skills: ["Athletics", "Stealth"] }));
    expect(labourer.slots).toEqual({ hp: 7, willpower: 6 });
    const kalleran = computeHero(hero({ species: "kalleran", origin: "prospect", path: "marauder", archetype: "tank", career: "freedom-fighter", array: A, skills: ["Athletics", "Stealth"] }));
    expect(kalleran.slots).toEqual({ hp: 6, willpower: 7 });
  });

  it("species threshold feeds the Major threshold (Anzellan 2)", () => {
    const d = computeHero(hero({ species: "anzellan", origin: "prospect", path: "technologist", archetype: "polestar", career: "engineer", array: A, skills: ["Piloting", "Technology"], choices: { [choiceKey(speciesKey("anzellan"), "edge")]: "evasion" } }));
    expect(d.thresholds.major).toBe(2 + d.traits.RES);
    expect(d.evasion).toBe(12 + d.traits.AGI + 2);
  });
});

describe("the level-up loop", () => {
  const marauder = (log: LevelEntry[]) => hero({ species: "cerean", origin: "prospect", path: "marauder", archetype: "berserker", career: "freedom-fighter", array: A, skills: ["Athletics", "Stealth"], log });

  const levels2to5 = [
    entry(2, "marauder", "berserker", pick("hp_slot"), pick("wp_slot")),
    entry(3, "marauder", "berserker", pick("hp_slot"), pick("wp_slot")),
    entry(4, "marauder", "berserker", pick("fury_damage"), pick("fury_usage")),
    entry(5, "marauder", "berserker", pick("trait", { trait: "STR" }), pick("proficiency_bonus")),
  ];

  it("a level 5 Marauder (Berserker): cards at Berserker levels 2, 3 and 4, a 5th level feature, proficiency +3, +1 more from the option", () => {
    const h = marauder(levels2to5);
    const d = computeHero(h);
    expect(d.issues).toEqual([]);
    expect(d.characterLevel).toBe(5);
    expect(d.tier).toBe(2);
    expect(pendingCards(h).map((c) => c.archetypeLevel)).toEqual([2, 3, 4]);
    expect(d.features.map((f) => f.name)).toContain("Savage Fury");
    expect(d.proficiencyBonus).toBe(3 + 1);
    expect(d.proficiencyLedger.map((r) => r.amount)).toEqual([3, 1]);
    expect(d.slots).toEqual({ hp: 8, willpower: 8 });
    expect(d.resources[0].text).toBe("Fury +4 damage, 4 uses"); // L4 step plus the two picks: damage 2+1+1, uses 2+1+1
  });

  it("two picks per level are mandatory", () => {
    const d = computeHero(marauder([entry(2, "marauder", "berserker", pick("hp_slot"))]));
    expect(d.issues.some((i) => i.level === 2 && /two options/.test(i.message))).toBe(true);
  });

  it("uses are limited per tier column", () => {
    const d = computeHero(marauder([
      entry(2, "marauder", "berserker", pick("trait", { trait: "STR" }), pick("trait", { trait: "STR" })),
      entry(3, "marauder", "berserker", pick("trait", { trait: "STR" }), pick("hp_slot")),
    ]));
    expect(d.issues.some((i) => i.level === 3 && /used up/.test(i.message))).toBe(true);
  });

  it("an option can't be taken from a tier you haven't reached", () => {
    const d = computeHero(marauder([entry(2, "marauder", "berserker", pick("hp_slot", { tier: 2 }), pick("wp_slot"))]));
    expect(d.issues.some((i) => /can't come from Tier 2/.test(i.message))).toBe(true);
  });

  it("the trait cap of +7 is enforced", () => {
    const h = hero({
      species: "wookiee", origin: "prospect", path: "marauder", archetype: "berserker", career: "freedom-fighter",
      array: { STR: 2, AGI: 1, RES: 1, FOR: 0, INT: 0, PRE: -1 }, skills: ["Athletics", "Stealth"],
      log: [
        entry(2, "marauder", "berserker", pick("trait", { trait: "STR" }), pick("trait", { trait: "STR" })),
        entry(3, "marauder", "berserker", pick("hp_slot"), pick("wp_slot")),
        entry(4, "marauder", "berserker", pick("hp_slot"), pick("wp_slot")),
        entry(5, "marauder", "berserker", pick("trait", { trait: "STR" }), pick("trait", { trait: "STR" })),
      ],
    });
    const d = computeHero(h);
    expect(d.traits.STR).toBe(2 + 2 + 4);
    expect(d.issues.some((i) => i.code === "trait_cap")).toBe(true);
    expect(optionsForNextLevel(h).find((o) => o.option.id === "trait")).toBeDefined();
  });

  it("removing the last level returns every derived value to what it was", () => {
    const full = marauder(levels2to5);
    const before = marauder(levels2to5.slice(0, 3));
    const snapshot = JSON.stringify(computeHero(before));
    expect(JSON.stringify(computeHero({ ...full, levelLog: full.levelLog.slice(0, 3) }))).toBe(snapshot);
  });
});

describe("Diversify and Multi-path (R-LOOP-2, R-LOOP-3)", () => {
  const techBase = (log: LevelEntry[]) => hero({ species: "bith", origin: "hardened", path: "technologist", archetype: "polestar", career: "engineer", array: A, skills: ["Piloting", "Technology"], choices: { [choiceKey(speciesKey("bith"), "instrument")]: "Flute" }, log });
  const polestar4 = [
    entry(2, "technologist", "polestar", pick("hp_slot"), pick("wp_slot")),
    entry(3, "technologist", "polestar", pick("hp_slot"), pick("wp_slot")),
    entry(4, "technologist", "polestar", pick("major_threshold"), pick("major_threshold")),
  ];

  it("a level 4 Technologist (Polestar) who diversifies into Safety Net becomes Technologist 5 (Polestar 4, Safety Net 1)", () => {
    const h = techBase([...polestar4, entry(5, "technologist", "safety-net", pick("diversify"))]);
    const d = computeHero(h);
    expect(d.issues).toEqual([]);
    const tech = d.paths.find((p) => p.pathId === "technologist")!;
    expect(tech.level).toBe(5);
    expect(tech.archetypes).toEqual([{ archetypeId: "polestar", level: 4 }, { archetypeId: "safety-net", level: 1 }]);
    const names = d.features.map((f) => f.name);
    expect(names).toContain("Bolstered by technology");
    expect(names).not.toContain("Coordinated Strike");
    expect(d.resources[0].text).toBe("2d4 Technologist Die"); // shared die grows with Path level
  });

  it("Diversify and Multi-path are only available from level 5", () => {
    const d = computeHero(techBase([entry(2, "technologist", "safety-net", pick("diversify"))]));
    expect(d.issues.some((i) => /available from level 5/.test(i.message))).toBe(true);
  });

  const devout = (array: Record<Trait, number>, log: LevelEntry[]) =>
    hero({ species: "cerean", origin: "prospect", path: "devout", archetype: "guardian", career: "freedom-fighter", array, skills: ["Athletics", "Stealth"], log });
  const guardian5 = [
    entry(2, "devout", "guardian", pick("hp_slot"), pick("wp_slot")),
    entry(3, "devout", "guardian", pick("hp_slot"), pick("wp_slot")),
    entry(4, "devout", "guardian", pick("major_threshold"), pick("major_threshold")),
  ];
  const toSentinel = entry(5, "devout", "blademaster", pick("multi_path", { pathId: "sentinel", archetypeId: "blademaster" }));

  it("Multi-path into Sentinel needs STR and FOR at +1 or more", () => {
    // Cerean: INT +1. Prospect: AGI +1. Array puts STR +1 and FOR +2.
    const ok = devout({ STR: 1, AGI: 0, RES: 0, FOR: 2, INT: 1, PRE: -1 }, [...guardian5, toSentinel]);
    const d = computeHero(ok);
    expect(d.issues).toEqual([]);
    expect(d.paths.map((p) => [p.pathId, p.level])).toEqual([["devout", 4], ["sentinel", 1]]);
    expect(d.casting.map((c) => c.kind).sort()).toEqual(["Faith", "Force casting"]);
    expect(d.powers.traditions).toContain("force");
    // a Multi-path never adds the new Path's saves
    expect(d.saves.filter((s) => s.proficient).map((s) => s.trait)).toEqual(["AGI", "FOR"]);

    const short = devout({ STR: 1, AGI: 1, RES: 2, FOR: 0, INT: 0, PRE: -1 }, [...guardian5, toSentinel]);
    expect(computeHero(short).issues.some((i) => /needs \+1 or more in STR and FOR/.test(i.message))).toBe(true);
  });

  it("raising the trait in the same level can't satisfy the check, but an earlier level can", () => {
    const array = { STR: 1, AGI: 1, RES: 2, FOR: 0, INT: 0, PRE: -1 };
    const earlier = devout(array, [
      entry(2, "devout", "guardian", pick("trait", { trait: "FOR" }), pick("hp_slot")),
      entry(3, "devout", "guardian", pick("hp_slot"), pick("wp_slot")),
      entry(4, "devout", "guardian", pick("major_threshold"), pick("major_threshold")),
      toSentinel,
    ]);
    expect(computeHero(earlier).issues).toEqual([]);
  });

  it("lists which paths are open to a Multi-path, with reasons", () => {
    const h = devout({ STR: 1, AGI: 0, RES: 0, FOR: 2, INT: 1, PRE: -1 }, guardian5);
    const c = multiPathCandidates(h);
    expect(c.find((x) => x.path.id === "sentinel")?.eligible).toBe(true);
    expect(c.find((x) => x.path.id === "devout")).toBeUndefined();
    const marauder = c.find((x) => x.path.id === "marauder")!;
    expect(marauder.eligible).toBe(false);
    expect(marauder.reason).toMatch(/RES/);
  });

  it("offers each option with its remaining uses and why it can't be taken", () => {
    const opts = optionsForNextLevel(devout({ STR: 1, AGI: 1, RES: 2, FOR: 0, INT: 0, PRE: -1 }, guardian5.slice(0, 1)));
    expect(opts.find((o) => o.option.id === "multi_path")?.available).toBe(false);
    expect(opts.find((o) => o.option.id === "multi_path")?.reason).toMatch(/level 5/);
    expect(opts.find((o) => o.option.id === "hp_slot")?.remaining).toEqual([{ tier: 1, uses: 1 }]);
  });
});

describe("Wayfarer and Vanguard (own tables)", () => {
  it("Wayfarer's Minor threshold option has one use and it has a skill tier option in Tier 1", () => {
    const h = hero({ species: "rodian", origin: "prospect", path: "wayfarer", archetype: "gunslinger", career: "smuggler", array: A, skills: ["Deception", "Skulduggery"] });
    const o = optionsForNextLevel(h);
    expect(o.find((x) => x.option.id === "minor_threshold")?.remaining).toEqual([{ tier: 1, uses: 1 }]);
    expect(o.find((x) => x.option.id === "skill_tier")?.available).toBe(true);
    expect(o.find((x) => x.option.id === "weapon_proficiency")?.available).toBe(false);
  });

  it("a Vanguard Lifeline gets Medicine, with Expertise if already held (Patch Up)", () => {
    const h = hero({ species: "cerean", origin: "prospect", path: "vanguard", archetype: "lifeline", career: "scholar", array: A, skills: ["Medicine", "Insight"] });
    expect(computeHero(h).skills.find((s) => s.skill === "Medicine")?.step).toBe(3);
  });
});
