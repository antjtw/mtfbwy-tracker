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

describe("species by book", () => {
  it("puts every species in a book, in book order and A to Z within each", async () => {
    const { SPECIES, SPECIES_BY_BOOK, BOOKS, bookOf } = await import("./data/species");
    expect(SPECIES_BY_BOOK).toHaveLength(SPECIES.length);
    // Nothing quietly fell into the default: each of these names is listed under its book
    expect(SPECIES.filter((s) => bookOf(s) === "Core rules").map((s) => s.name).sort()).toEqual(["Bith", "Cerean", "Human", "Rodian", "Twi’lek", "Wookiee"]);
    expect(SPECIES.filter((s) => bookOf(s) === "Allies and adversaries").map((s) => s.name).sort()).toEqual(["Aqualish", "Barabel", "Gand", "Pantoran", "Pkorian", "Togorian", "Tusken"]);
    expect(SPECIES.filter((s) => bookOf(s) === "Myths and Fables").map((s) => s.name)).toEqual(["Chironian"]);
    const books = SPECIES_BY_BOOK.map(bookOf);
    expect(books).toEqual([...books].sort((a, b) => BOOKS.indexOf(a) - BOOKS.indexOf(b)));
    for (const b of BOOKS.filter((x) => x !== "The Essential Guide to Droids")) {
      const names = SPECIES_BY_BOOK.filter((s) => bookOf(s) === b).map((s) => s.name);
      expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y)));
    }
    expect(SPECIES_BY_BOOK.filter((s) => bookOf(s) === "The Essential Guide to Droids").map((s) => s.name)).toEqual(["Droid, second class", "Droid, third class", "Droid, fourth class"]);
  });
});

describe("Chironian", () => {
  it("has Strength +1, threshold 4 and its three abilities", async () => {
    const { SPECIES_BY_ID } = await import("./data/species");
    const { SPECIES_FEATURES } = await import("./data/features");
    expect(SPECIES_BY_ID["chironian"].threshold).toBe(4);
    expect(SPECIES_BY_ID["chironian"].grants).toEqual([{ type: "trait_increase", trait: "STR", amount: 1 }]);
    expect(SPECIES_FEATURES["chironian"].map((f) => f.name)).toEqual(["Gallop", "Hind kick", "Four-legged"]);
  });
});
