import type { Career, Grant, SkillName } from "../types";

/**
 * Careers (spec 9.2). Each grants one skill (Expertise if you already hold it) and a tool. `equipment` is a filter
 * the equipment picker will apply (R-EQ-2), not a list of items.
 */
function career(
  id: string,
  name: string,
  skill: SkillName | null,
  tool: string,
  pack: string,
  equipment: string,
  extra: {
    fixedKit?: string[];
    notes?: string;
    grants?: Grant[];
    jedi?: boolean;
    choices?: Career["choices"];
  } = {},
): Career {
  return {
    id,
    name,
    grants: [
      ...(skill ? ([{ type: "skill_proficiency", skill }] as Grant[]) : []),
      ...(extra.jedi ? ([{ type: "power_access", tradition: "force" }] as Grant[]) : []),
      ...(extra.grants ?? []),
    ],
    choices: extra.choices ?? [],
    equipment,
    fixedKit: extra.fixedKit ?? [],
    pack,
    tool,
    notes: extra.notes,
    extraTier0Force: extra.jedi,
  };
}

export const CAREERS: readonly Career[] = [
  career("bounty-hunter", "Bounty hunter", "Survival", "Torturer’s tools", "Advanced survival", "Any weapon and armour", { notes: "Resourceful Hunter (casting: INT)" }),
  career("freedom-fighter", "Freedom fighter", "Survival", "Armourer’s tools", "Advanced survival", "Any weapon and armour"),
  career("jedi-knight", "Jedi Knight", "Religion", "Academic’s tools", "Devotee’s", "Any kyber weapon", {
    fixedKit: ["Jedi robes (+2 Evasion, no protection)"],
    jedi: true,
    notes: "Basic Force powers and an extra Tier 0 Force power; Padawan or Master by level",
  }),
  career("pilot", "Pilot", "Piloting", "Cartographer’s tools", "Spacer’s", "Any weapon and armour"),
  career("scholar", "Scholar", "History", "Academic’s tools", "Advanced survival", "Any weapon and armour"),
  career("smuggler", "Smuggler", "Skulduggery", "Thieves’ tools", "Spacer’s", "Any weapon and armour", { fixedKit: ["Common clothes"] }),
  career("droidsmith", "Droidsmith", "Technology", "Droidsmith’s tools", "Tradesperson’s", "Any weapon and armour"),
  career("force-scholar", "Force scholar", null, "Academic’s tools", "Devotee’s", "Any blaster", {
    fixedKit: ["Scholar’s robes (+2 Evasion, no protection)"],
    choices: [{ id: "skill", label: "Religion or History", kind: "skill", n: 1, options: ["Religion", "History"] }],
  }),
  career("dj", "DJ", "Coordination", "Slicer’s tools", "Streetwise", "Any standard blaster", { fixedKit: ["Portable sound rig"] }),
  career("jedi-wayseeker", "Jedi Wayseeker", "Survival", "Cartographer’s tools", "Advanced survival", "Any kyber weapon", {
    fixedKit: ["Jedi robes", "Comm link"],
    jedi: true,
    notes: "Basic Force powers and an extra Tier 0 Force power",
  }),
  career("gladiator", "Gladiator", "Coercion", "Armourer’s tools", "Streetwise", "Any melee physical weapon, a shield or armour"),
  career("labourer", "Labourer", "Athletics", "A toolkit of your choice", "Tradesperson’s", "Any standard weapon", {
    fixedKit: ["Work clothes"],
    grants: [{ type: "slot_change", resource: "hp", amount: 1 }],
    choices: [{ id: "tool", label: "Armourer’s, Mechanic’s or Herbalist’s tools", kind: "text" }],
    notes: "Starts with 7 Hit Point slots",
  }),
  career("meknek", "Meknek", "Athletics", "Mechanic’s tools", "Spacer’s", "Any armour", { fixedKit: ["Work clothes", "Gripton boots"] }),
  career("outlaw", "Outlaw", "Stealth", "Thieves’ tools", "Advanced survival", "Any blaster, light armour", {
    fixedKit: ["Forged identichip or false papers"],
    notes: "Starts with a bounty",
  }),
  career("criminal", "Criminal", "Skulduggery", "Thieves’ tools", "Streetwise", "Any blaster pistol or melee weapon", { notes: "Ties to a criminal organisation" }),
  career("treasure-hunter", "Treasure Hunter", "Perception", "Cartographer’s tools", "Advanced survival", "Any blaster pistol or physical weapon, light armour"),
  career("ambassador", "Ambassador", "Negotiation", "Academic’s tools", "Streetwise", "Any blaster", { fixedKit: ["Fine clothes"] }),
  career("assassin", "Assassin", "Stealth", "Biotech’s tools", "Streetwise", "Any physical weapon and armour"),
  career("crime-lord", "Crime Lord", "Coercion", "Thieves’ tools", "Streetwise", "Any standard blaster, armour"),
  career("engineer", "Engineer", "Technology", "Mechanic’s tools", "Tradesperson’s", "Any weapon and armour"),
  career("jedi-outcast", "Jedi Outcast", "Insight", "Cartographer’s tools", "Spacer’s", "Any kyber weapon", {
    fixedKit: ["Traveller’s robes"],
    jedi: true,
    notes: "Basic Force powers and an extra Tier 0 Force power",
  }),
  career("pathfinder", "Pathfinder", "Astrogation", "Cartographer’s tools", "Advanced survival", "Any weapon and armour"),
  career("slicer", "Slicer", "Technology", "Slicer’s tools", "Streetwise", "Any standard blaster, armour", {
    notes: "Routine Job: automatically bypass Target 12 × proficiency",
  }),
  career("pod-racer", "Pod Racer", "Piloting", "Mechanic’s tools", "Tradesperson’s", "Any standard blaster", {
    fixedKit: ["Flight suit and goggles"],
  }),
];

export const CAREER_BY_ID: Record<string, Career> = Object.fromEntries(CAREERS.map((c) => [c.id, c]));
