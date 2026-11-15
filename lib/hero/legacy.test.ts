import { describe, expect, it } from "vitest";
import { SEED_CHARACTERS } from "../seed";
import { computeHero } from "./engine";
import { heroFromCharacter } from "./legacy";

const by = (name: string) => SEED_CHARACTERS.find((c) => c.name === name)!;

describe("rebuilding tracker characters as half-built Heroes", () => {
  it("Fenrir: the build is read, the implicit parts are filled in, the player's own picks are left open", () => {
    const { hero, unmapped } = heroFromCharacter(by("Fenrir"));
    expect(unmapped).toEqual([]);
    expect([hero.species.id, hero.origin.id, hero.career.id, hero.path.id, hero.path.archetypeId]).toEqual(["pooba", "jedi-initiate", "jedi-knight", "sentinel", "blademaster"]);
    expect(hero.levelLog).toHaveLength(3); // Blademaster 4: levels 2 to 4
    const d = computeHero(hero);
    expect(d.characterLevel).toBe(4);
    // implicit: Pooba STR +1 and Jedi Initiate FOR +1, Negotiation (origin), Coercion (species), Religion (career)
    expect(d.traitLedger.STR.some((r) => r.source === "Pooba")).toBe(true);
    expect(d.traits.FOR).toBeGreaterThanOrEqual(1);
    expect(d.skills.filter((s) => s.step > 0).map((s) => s.skill).sort()).toEqual(["Coercion", "Negotiation", "Religion"]);
    expect(d.powers.traditions).toEqual(["force"]);
    // open: the array, two path skills, and two picks at each level
    const messages = d.issues.map((i) => i.message).join(" | ");
    expect(messages).toMatch(/starting array/);
    expect(messages).toMatch(/choose 2 skills/);
    expect(d.issues.filter((i) => i.level).map((i) => i.level)).toEqual([2, 3, 4]);
  });

  it("a Human's ancestry in brackets becomes the subspecies", () => {
    const { hero } = heroFromCharacter(by("Cors 'Blitz' Ghrenald"));
    expect(hero.species).toEqual({ id: "human", subspeciesId: "coruscanti" });
  });

  it("Bingus: three Paths are laid out so each branch lands from level 5", () => {
    const { hero } = heroFromCharacter(by("Bingus-K’aar"));
    expect(hero.path).toEqual({ id: "technologist", archetypeId: "polestar" });
    expect(hero.levelLog.map((e) => e.picks[0]?.optionId ?? "-")).toEqual(["-", "-", "-", "-", "-", "multi_path", "-", "multi_path"]);
    const d = computeHero(hero);
    expect(d.characterLevel).toBe(9);
    expect(d.paths.map((p) => [p.pathId, p.level])).toEqual([["technologist", 6], ["vanguard", 2], ["wayfarer", 1]]);
  });

  it("names the parts of a build the rules data doesn't cover yet", () => {
    expect(heroFromCharacter(by("Vesh Caldrin")).unmapped).toContain("species Kage");
    expect(heroFromCharacter(by("Vesh Caldrin")).unmapped).toContain("archetype Crusader (Devout)");
    expect(heroFromCharacter(by("Eisor Trius")).unmapped).toContain("career Nihil Cloud Enforcer");
  });

  it("a character with no build gives an empty Hero with just a name", () => {
    const { hero } = heroFromCharacter({ name: "Nobody", species: "", origin: "", career: "", paths: [] });
    expect(hero.species.id).toBe("");
    expect(hero.levelLog).toEqual([]);
  });
});
