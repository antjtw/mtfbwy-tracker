import { describe, expect, it } from "vitest";
import { rollModifiers } from "./rollModifiers";
import { buildSheet, keysToClear, refreshOf } from "./sheet";
import { choiceKey, emptyHero, pathKey } from "./engine";

describe("sheet", () => {
  it("reads how often an ability comes back", () => {
    expect(refreshOf("Once per Full Rest, you may reroll a failed Skulduggery roll")).toBe("full");
    expect(refreshOf("Once per short rest, reroll a failed Survival or Perception check")).toBe("short");
    expect(refreshOf("Once per session, you may declare you know someone here")).toBe("session");
    expect(refreshOf("You have Advantage on Coercion rolls")).toBeUndefined();
  });

  it("builds passives, resources and abilities, and says what a rest clears", () => {
    const h = emptyHero();
    h.species = { id: "wookiee" };
    h.origin = { id: "survivor" };
    h.choices = { [choiceKey("origin:survivor", "skill")]: "Insight", [choiceKey(pathKey("marauder"), "skills")]: ["Athletics", "Survival"] };
    h.path = { id: "marauder", archetypeId: "berserker" };
    h.career = { id: "smuggler" };
    h.traitArray = { STR: 2, AGI: 0, RES: 1, FOR: 0, INT: 0, PRE: -1 };
    const s = buildSheet(h);
    expect(s.passives.map((p) => p.name)).toEqual(["Insight", "Force", "Perception"]);
    expect(s.passives[1].value).toBe(12 + s.traits.find((t) => t.trait === "FOR")!.modifier);
    expect(s.speed.metres).toBe(9);
    expect(s.skills).toHaveLength(18);
    const charm = s.abilities.find((a) => a.name === "Deceptive Charm");
    expect(charm?.per).toBe("full");
    expect(keysToClear(s, "short")).not.toContain(`ability:${charm!.key}`);
    expect(keysToClear(s, "full")).toContain(`ability:${charm!.key}`);
    expect(s.resources.find((r) => r.name === "Fury")?.spendable).toBe(true);
  });

  it("reads advantage and disadvantage on skills and saves from the wording", () => {
    
    const m = rollModifiers([
      { name: "Feared", text: "You have Advantage on Coercion rolls" },
      { name: "Hidden Compartments", text: "You have Advantage on Stealth or Skulduggery rolls when concealing items" },
      { name: "Optimistic Courage", text: "You have disadvantage on Insight rolls to detect deception or hostile intent." },
      { name: "Agile", text: "Advantage on Agility saving rolls" },
      { name: "Distraction tactics", text: "you may grant one ally Advantage on their next attack roll against that adversary." },
    ]);
    expect(m.skills.Coercion.advantage).toEqual(["Feared"]);
    expect(Object.keys(m.skills).sort()).toEqual(["Coercion", "Insight", "Skulduggery", "Stealth"]);
    expect(m.skills.Insight.disadvantage).toEqual(["Optimistic Courage"]);
    expect(m.saves.AGI?.advantage).toEqual(["Agile"]);
  });

  it("adds chosen cards to the abilities, grouped by how they're used", async () => {
    const { BUNDLED_CARDS } = await import("./cards");
    const h = emptyHero();
    h.species = { id: "wookiee" };
    h.origin = { id: "force-sensitive" };
    h.path = { id: "mystic", archetypeId: "cosmic" };
    h.career = { id: "jedi-knight" };
    h.traitArray = { STR: 0, AGI: 1, RES: 1, FOR: 2, INT: 0, PRE: -1 };
    h.choices = { [choiceKey(pathKey("mystic"), "skills")]: ["Athletics", "Insight"] };
    const evade = BUNDLED_CARDS.find((c) => c.name === "Foreseen evade")!;
    h.levelLog = [{ characterLevel: 2, pathId: "mystic", archetypeId: "cosmic", picks: [], cardId: evade.id }];
    const s = buildSheet(h, BUNDLED_CARDS);
    const a = s.abilities.find((x) => x.key === `card:${evade.id}`);
    expect(a?.name).toBe("Foreseen evade");
    expect(a?.kind).toBe("trigger");
    expect(buildSheet(h).abilities.some((x) => x.key.startsWith("card:"))).toBe(false);
  });
});
