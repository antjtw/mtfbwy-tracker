import type { Choice, Grant, SkillName, Source, Species, Trait } from "../types";

/**
 * Species (spec 9.6, condensed from the Playtest manual and the Luminous Beings Collection).
 * Gaps flagged in `notes` are things the spec says weren't read; they stay data until the source is confirmed.
 */

const t = (trait: Trait, amount = 1): Grant => ({ type: "trait_increase", trait, amount });
const sk = (skill: SkillName): Grant => ({ type: "skill_proficiency", skill });
const feat = (name: string, text?: string): Grant => ({ type: "feature", name, text });
const slug = (n: string) => n.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const language = (label = "A language"): Choice => ({ id: "language", label, kind: "text" });
const oneOf = (a: SkillName, b: SkillName): Choice => ({ id: "skill", label: `${a} or ${b}`, kind: "skill", n: 1, options: [a, b] });

function species(
  name: string,
  threshold: number,
  grants: Grant[],
  extra: {
    choices?: Choice[];
    subspeciesLabel?: string;
    subspecies?: Source[];
    notes?: string[];
    id?: string;
  } = {},
): Species {
  return {
    id: extra.id ?? slug(name),
    name,
    threshold,
    grants,
    choices: extra.choices ?? [],
    subspeciesLabel: extra.subspeciesLabel,
    subspecies: extra.subspecies,
    notes: extra.notes,
  };
}

const sub = (name: string, grants: Grant[] = [], choices: Choice[] = []): Source => ({ id: slug(name), name, grants, choices });

export const SPECIES: readonly Species[] = [
  species("Human", 3, [], {
    choices: [{ id: "any-trait", label: "Increase any trait by +1", kind: "trait", amount: 1 }, language("One language")],
    subspeciesLabel: "Ancestral origin",
    subspecies: [
      sub("Alderaanian", [t("PRE"), sk("Negotiation")]),
      sub("Coruscanti", [t("PRE"), sk("Insight")]),
      sub("Ghorman", [t("PRE"), sk("Coordination")]),
      sub("Onderonian", [t("RES"), sk("Survival")]),
    ],
  }),
  species("Bith", 3, [t("INT", 2), sk("Investigation")], { choices: [{ id: "instrument", label: "A musical instrument", kind: "text" }] }),
  species("Cerean", 3, [t("INT"), sk("Negotiation")]),
  species("Rodian", 3, [t("AGI"), sk("Survival"), sk("Stealth")]),
  species("Twi’lek", 3, [t("PRE"), t("AGI")], { choices: [oneOf("Coercion", "Negotiation")], notes: ["Optional lekku teeth feature"] }),
  species("Wookiee", 3, [t("STR", 2), sk("Athletics"), sk("Coercion")], { notes: ["Cannot squeeze through small spaces"] }),
  species("Aqualish", 3, [t("PRE")], {
    choices: [language("One language")],
    subspeciesLabel: "Kind",
    subspecies: [sub("Aquala"), sub("Quara"), sub("Ualaq")],
  }),
  species("Barabel", 3, [t("STR")], { choices: [oneOf("Athletics", "Survival")], notes: ["Natural armour equal to your RES modifier (minimum 1), effective against PHY"] }),
  species("Gand", 3, [t("RES"), sk("Perception")], {
    subspeciesLabel: "Kind",
    subspecies: [sub("Ammonia-breather"), sub("Lungless")],
    notes: ["Natural armour equal to your RES modifier (minimum 1), effective against PHY"],
  }),
  species("Dashade", 4, [t("RES")], { notes: ["Force-resistant"] }),
  species("Nautolan", 3, [t("AGI"), sk("Insight")]),
  species("Pantoran", 3, [t("PRE"), t("INT")], { choices: [language("First language"), { id: "language-2", label: "Second language", kind: "text" }] }),
  species("Pkorian", 3, [t("AGI"), sk("Perception")], { choices: [language("One language")] }),
  species("Togorian", 3, [t("STR")], { choices: [oneOf("Perception", "Stealth")] }),
  species("Tusken", 3, [t("RES"), sk("Survival"), sk("Animal Handling")]),
  species("Evereni", 3, [t("PRE"), sk("Insight")]),
  species("Ikkrukkian", 4, [t("PRE")], { choices: [language("One language")] }),
  species("Pooba", 4, [t("STR"), sk("Coercion")], { choices: [language("One language (understand only)")], notes: ["Cannot squeeze through small spaces"] }),
  species("Tynnan", 3, [t("INT"), sk("Survival"), sk("History")], { notes: ["Small"] }),
  species("Vintian", 4, [t("RES"), sk("Astrogation")], { notes: ["Half speed"] }),
  species("Besalisk", 4, [t("RES"), sk("Coercion")], { choices: [language("One language")], notes: ["Four arms: two extra hands of Burden"] }),
  species("Lasat", 3, [t("STR"), sk("Athletics")]),
  species("Trandoshan", 3, [t("STR"), sk("Coercion")], { choices: [language("One language")] }),
  species("Kiffar", 3, [], {
    subspeciesLabel: "Kind",
    subspecies: [
      sub("Kiffu / Kiffex", [t("STR"), t("AGI")]),
      // The rules entry merges two blocks. "PRE +1 and any one" is read here as any one trait.
      sub("Quarzite", [t("PRE")], [{ id: "any-trait", label: "Increase any trait by +1", kind: "trait", amount: 1 }]),
    ],
    notes: ["Rules data entry merges Kiffu/Kiffex and Quarzite; the Quarzite “any one” is read as a trait choice"],
  }),
  species("Anzellan", 2, [t("INT", 2), sk("Technology"), sk("Skulduggery")], {
    choices: [
      {
        id: "edge",
        label: "Your edge",
        kind: "bundle",
        options: [
          { id: "evasion", label: "+2 Evasion", grants: [{ type: "evasion_bonus", amount: 2 }] },
          { id: "agi-saves", label: "Advantage on Agility saving rolls", grants: [feat("Advantage on Agility saving rolls")] },
        ],
      },
    ],
    notes: ["Tiny", "No two-handed or heavy weapons, no shields, armour no heavier than light", "Swap your edge on level up"],
  }),
  species("Zabrak", 3, [sk("Survival"), sk("Coordination")], {
    subspeciesLabel: "Kind",
    subspecies: [sub("Iridonian", [t("PRE")]), sub("Dathomirian", [t("FOR")])],
  }),
  species("Kalleran", 3, [t("STR"), sk("Skulduggery"), { type: "slot_change", resource: "willpower", amount: 1 }]),
  species("Nikto", 3, [sk("Survival")], {
    subspeciesLabel: "Kind",
    subspecies: [sub("Red", [t("STR")]), sub("Green", [t("RES")]), sub("Mountain", [t("AGI")])],
    notes: ["Each kind also gives a skill; the spec says these weren't read, so none is applied yet"],
  }),
  species("Clawdite", 3, [t("AGI")], {
    choices: [oneOf("Skulduggery", "Deception")],
    notes: ["Speaks Galactic Basic and Zolanese", "Optional shifting colours display, with no mechanical effect"],
  }),
  species("Anomid", 3, [t("INT"), sk("Technology"), sk("Skulduggery")], { choices: [language("One language")], notes: ["Vocoder mask"] }),
  species("Mon Calamari", 3, [t("INT")], { choices: [oneOf("Negotiation", "Technology")] }),
  species("Mustafarian", 3, [], {
    subspeciesLabel: "Kind",
    subspecies: [sub("Northern", [t("AGI")]), sub("Southern", [t("STR")])],
    choices: [
      {
        id: "skills",
        label: "Your skills",
        kind: "bundle",
        options: [
          { id: "animals", label: "Animal Handling and Perception", grants: [sk("Animal Handling"), sk("Perception")] },
          { id: "athletics", label: "Athletics", grants: [sk("Athletics")] },
        ],
      },
    ],
    notes: ["The rules entry gives this as “Animal Handling and Perception, or Athletics”; it is offered as a choice"],
  }),
  species("Tiss’shar", 3, [t("PRE")], { choices: [oneOf("Negotiation", "Deception")] }),
  species("Droid, second class", 2, [t("INT")], { id: "droid-2", notes: ["Small", "4 module slots", "Cannot wear armour"] }),
  species("Droid, third class", 3, [t("INT")], { id: "droid-3", choices: [{ id: "languages", label: "Five extra languages", kind: "text" }], notes: ["3 module slots"] }),
  species("Droid, fourth class", 3, [t("STR"), t("AGI")], { id: "droid-4", notes: ["2 module slots", "Plating armour 2"] }),
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
