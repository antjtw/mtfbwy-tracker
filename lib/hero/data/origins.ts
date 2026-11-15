import type { Origin } from "../types";

/** Origins (spec 9.1). Playtest manual: the first seven; the rest come from the sourcebooks named in the spec. */
export const ORIGINS: readonly Origin[] = [
  {
    id: "abandoned",
    name: "Abandoned",
    grants: [
      { type: "trait_increase", trait: "RES", amount: 1 },
      { type: "skill_proficiency", skill: "Survival" },
      { type: "feature", name: "Survivor’s Instinct" },
    ],
    choices: [],
  },
  {
    id: "force-sensitive",
    name: "Force Sensitive",
    grants: [
      { type: "trait_increase", trait: "FOR", amount: 1 },
      { type: "skill_proficiency", skill: "Insight" },
      { type: "power_access", tradition: "force" },
    ],
    choices: [],
  },
  {
    id: "hardened",
    name: "Hardened",
    grants: [
      { type: "trait_increase", trait: "RES", amount: 1 },
      { type: "skill_proficiency", skill: "Investigation" },
      { type: "feature", name: "Street Smarts" },
      { type: "feature", name: "Indomitable Spirit" },
    ],
    choices: [],
  },
  {
    id: "jedi-initiate",
    name: "Jedi Initiate",
    summary: "Raised within the Jedi Temple, you know little life beyond its walls.",
    grants: [
      { type: "trait_increase", trait: "FOR", amount: 1 },
      { type: "skill_proficiency", skill: "Negotiation" },
      { type: "power_access", tradition: "force" },
    ],
    choices: [],
  },
  {
    id: "prospect",
    name: "Prospect",
    grants: [
      { type: "trait_increase", trait: "AGI", amount: 1 },
      { type: "skill_proficiency", skill: "Athletics" },
      { type: "feature", name: "Eager initiate" },
    ],
    choices: [],
  },
  {
    id: "tribal",
    name: "Tribal",
    summary: "Born into ancient customs, you thrive through community and tradition.",
    grants: [
      { type: "trait_increase", trait: "PRE", amount: 1 },
      { type: "skill_proficiency", skill: "Perception" },
      { type: "feature", name: "Tribal Connection" },
    ],
    // D13: "one standard weapon" (any weapon that isn't advanced), a tool, or an instrument
    choices: [{ id: "tribal-pick", label: "One standard weapon, one tool or one musical instrument", kind: "text" }],
  },
  {
    id: "witchborn",
    name: "Witchborn",
    grants: [
      { type: "trait_increase", trait: "FOR", amount: 1 },
      { type: "skill_proficiency", skill: "Survival" },
      { type: "power_access", tradition: "magick" },
    ],
    choices: [],
  },
  {
    id: "optimist",
    name: "Optimist",
    grants: [
      { type: "trait_increase", trait: "PRE", amount: 1 },
      { type: "skill_proficiency", skill: "Negotiation" },
      { type: "feature", name: "Optimistic Courage", text: "Drawback on Insight." },
    ],
    choices: [],
  },
  {
    id: "survivor",
    name: "Survivor",
    grants: [
      { type: "trait_increase", trait: "RES", amount: 1 },
      { type: "feature", name: "Tragic Resilience" },
    ],
    choices: [{ id: "skill", label: "Insight or Perception", kind: "skill", n: 1, options: ["Insight", "Perception"] }],
  },
  {
    id: "addict",
    name: "Addict",
    grants: [
      { type: "trait_increase", trait: "RES", amount: 1 },
      { type: "feature", name: "Running on Empty" },
    ],
    choices: [{ id: "skill", label: "Medicine or Skulduggery", kind: "skill", n: 1, options: ["Medicine", "Skulduggery"] }],
  },
  {
    id: "everyman",
    name: "Everyman",
    grants: [
      { type: "trait_increase", trait: "INT", amount: 1 },
      { type: "feature", name: "Resourceful" },
    ],
    choices: [{ id: "skill", label: "Any one skill", kind: "skill", n: 1 }],
  },
  {
    id: "exile",
    name: "Exile",
    grants: [
      { type: "trait_increase", trait: "AGI", amount: 1 },
      { type: "skill_proficiency", skill: "Deception" },
      { type: "feature", name: "Adaptable Survivor" },
    ],
    choices: [],
  },
  {
    id: "privileged",
    name: "Privileged",
    grants: [
      { type: "trait_increase", trait: "INT", amount: 1 },
      { type: "skill_proficiency", skill: "Negotiation" },
      { type: "feature", name: "Name and means" },
    ],
    choices: [],
  },
];

export const ORIGIN_BY_ID: Record<string, Origin> = Object.fromEntries(ORIGINS.map((o) => [o.id, o]));
