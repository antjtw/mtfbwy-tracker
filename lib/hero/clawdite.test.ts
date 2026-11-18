import { describe, expect, it } from "vitest";
import { SPECIES_BY_ID } from "./data/species";
import { SPECIES_FEATURES } from "./data/features";
import { abilityKind } from "./abilityKind";
import { rollModifiers } from "./rollModifiers";

describe("Clawdite", () => {
  const c = SPECIES_BY_ID["clawdite"];
  it("is a species with Agility +1, threshold 3 and a Skulduggery or Deception proficiency to choose", () => {
    expect(c.name).toBe("Clawdite");
    expect(c.threshold).toBe(3);
    expect(c.grants).toEqual([{ type: "trait_increase", trait: "AGI", amount: 1 }]);
    expect(c.choices[0]).toMatchObject({ kind: "skill", n: 1, options: ["Skulduggery", "Deception"] });
  });
  it("has its three abilities, and Trust no face gives advantage on Insight", () => {
    const feats = SPECIES_FEATURES["clawdite"];
    expect(feats.map((f) => f.name)).toEqual(["Shapeshifter", "Aching change", "Trust no face"]);
    expect(rollModifiers(feats).skills["Insight"].advantage).toEqual(["Trust no face"]);
    expect(abilityKind("Shapeshifter", feats[0].text)).toBe("manoeuvre");
  });
});
