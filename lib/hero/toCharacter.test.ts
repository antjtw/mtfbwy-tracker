import { describe, expect, it } from "vitest";
import { choiceKey, emptyHero, pathKey } from "./engine";
import { sanitizeHero } from "./sanitize";
import { characterFromHero } from "./toCharacter";

function labourerMystic() {
  const h = emptyHero();
  h.species = { id: "wookiee" };
  h.origin = { id: "force-sensitive" };
  h.path = { id: "mystic", archetypeId: "cosmic" };
  h.career = { id: "labourer" };
  h.traitArray = { STR: 0, AGI: 1, RES: 1, FOR: 2, INT: 0, PRE: -1 };
  h.choices = { [choiceKey(pathKey("mystic"), "skills")]: ["Athletics", "Insight"] };
  h.identity.name = "Test Hero";
  return h;
}

describe("characterFromHero", () => {
  it("takes slots from the engine and describes the build in the tracker's one-line form", () => {
    const c = characterFromHero(labourerMystic(), "james-allen", new Set(), 56);
    expect(c).toMatchObject({ id: "test-hero", player_id: "james-allen", name: "Test Hero", hp_max: 7, wp_max: 6, ar_max: 0, hp_used: 0, wp_used: 0, tracked: true, sort: 56 });
    expect(c.description).toBe("Force Sensitive Wookiee, Cosmic Mystic, Labourer");
    expect(c.paths).toEqual([{ path: "Mystic", archetypes: [{ name: "Cosmic", level: 1 }] }]);
  });

  it("puts the Hero in the chosen adventure, or none", () => {
    expect(characterFromHero(labourerMystic(), "p", new Set(), 1, "Campaign 3").adventures).toEqual(["Campaign 3"]);
    expect(characterFromHero(labourerMystic(), "p", new Set(), 1).adventures).toEqual([]);
  });

  it("never reuses an existing id", () => {
    expect(characterFromHero(labourerMystic(), "p", new Set(["test-hero", "test-hero-2"]), 1).id).toBe("test-hero-3");
  });
});

describe("sanitizeHero", () => {
  it("keeps only builder fields and starts at level 1 with no level log", () => {
    const h = sanitizeHero({ ...labourerMystic(), levelLog: [{ bad: true }], startingLevel: 12, extra: "x", identity: { name: "  A  ", backstory: 5 } })!;
    expect(h.levelLog).toEqual([]);
    expect(h.startingLevel).toBe(1);
    expect(h.identity.name).toBe("A");
    expect(h.identity.backstory).toBe("");
    expect("extra" in h).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(sanitizeHero(null)).toBeNull();
    expect(sanitizeHero("x")).toBeNull();
  });
});
