import { SKILLS, TRAITS, TRAIT_NAMES, type Trait } from "./types";

/*
 * Which skills and saving rolls an ability gives Advantage or Disadvantage on, read from its wording
 * ("You have Advantage on Coercion rolls", "disadvantage on Insight rolls to detect deception").
 * Most of these are situational, so the sheet only flags them and names where they come from.
 */

export interface RollMods {
  advantage: string[];
  disadvantage: string[];
}
export interface RollModMap {
  skills: Record<string, RollMods>;
  saves: Partial<Record<Trait, RollMods>>;
}

const empty = (): RollMods => ({ advantage: [], disadvantage: [] });

export function rollModifiers(abilities: { name: string; text: string }[]): RollModMap {
  const out: RollModMap = { skills: {}, saves: {} };
  const note = (kind: "advantage" | "disadvantage", source: string, skill?: string, trait?: Trait) => {
    const slot = skill ? (out.skills[skill] ??= empty()) : (out.saves[trait!] ??= empty());
    if (!slot[kind].includes(source)) slot[kind].push(source);
  };
  for (const a of abilities) {
    for (const sentence of a.text.split(/(?<=[.!?])\s+|\n/)) {
      // Advantage given to someone else isn't yours
      if (/\b(grant|gives?|allies|ally)\b/i.test(sentence) && !/\byou have\b/i.test(sentence)) continue;
      for (const m of sentence.matchAll(/\b(dis)?advantage on ([^.;:]*?)\brolls?\b/gi)) {
        const kind = m[1] ? "disadvantage" : "advantage";
        const segment = m[2];
        if (/saving/i.test(segment)) {
          for (const t of TRAITS) if (new RegExp(`\\b${TRAIT_NAMES[t]}\\b`, "i").test(segment)) note(kind, a.name, undefined, t);
        } else {
          for (const { name } of SKILLS) if (new RegExp(`\\b${name}\\b`, "i").test(segment)) note(kind, a.name, name);
        }
      }
    }
  }
  return out;
}
