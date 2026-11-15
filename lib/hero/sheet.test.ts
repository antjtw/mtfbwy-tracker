import { describe, expect, it } from "vitest";
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
    expect(s.passives.map((p) => p.name)).toEqual(["Perception", "Insight", "Force"]);
    expect(s.passives[2].value).toBe(12 + s.traits.find((t) => t.trait === "FOR")!.modifier);
    expect(s.speed.metres).toBe(9);
    expect(s.skills).toHaveLength(18);
    const charm = s.abilities.find((a) => a.name === "Deceptive Charm");
    expect(charm?.per).toBe("full");
    expect(keysToClear(s, "short")).not.toContain(`ability:${charm!.key}`);
    expect(keysToClear(s, "full")).toContain(`ability:${charm!.key}`);
    expect(s.resources.find((r) => r.name === "Fury")?.spendable).toBe(true);
  });
});
