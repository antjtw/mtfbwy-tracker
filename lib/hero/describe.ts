import { TRAIT_NAMES, type Grant, type Source, type Species } from "./types";

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Plain-English lines for a "You gain" block */
export function describeGrants(grants: readonly Grant[]): string[] {
  const out: string[] = [];
  for (const g of grants) {
    switch (g.type) {
      case "trait_increase": out.push(`${TRAIT_NAMES[g.trait]} ${signed(g.amount)}`); break;
      case "skill_proficiency": out.push(`Proficient in ${g.skill}`); break;
      case "saving_roll_proficiency": out.push(`Proficient in ${TRAIT_NAMES[g.trait]} saving rolls`); break;
      case "threshold_bonus": out.push(`${g.band === "minor" ? "Minor" : "Major"} damage threshold ${signed(g.amount)}`); break;
      case "slot_change": out.push(`${g.amount > 0 ? "+" : ""}${g.amount} ${g.resource === "hp" ? "Hit Point" : "Willpower"} slot${Math.abs(g.amount) === 1 ? "" : "s"}`); break;
      case "evasion_bonus": out.push(`Evasion ${signed(g.amount)}`); break;
      case "power_access": out.push(`Basic ${g.tradition === "force" ? "Force" : g.tradition === "magick" ? "Magick" : "Tech"} powers`); break;
      case "feature": out.push(g.text ? `${g.name}: ${g.text}` : g.name); break;
    }
  }
  return out;
}

/** What a source gives, for a short line in a list: "STR +1 · Athletics" */
export function oneLine(source: Source | Species): string {
  const bits: string[] = [];
  const traits = source.grants.filter((g): g is Extract<Grant, { type: "trait_increase" }> => g.type === "trait_increase");
  if (traits.length) bits.push(traits.map((g) => `${g.trait} ${signed(g.amount)}`).join(", "));
  else if ("subspecies" in source && source.subspecies?.some((s) => s.grants.some((g) => g.type === "trait_increase"))) bits.push("trait depends on kind");
  const skills = source.grants.filter((g): g is Extract<Grant, { type: "skill_proficiency" }> => g.type === "skill_proficiency");
  if (skills.length) bits.push(skills.map((g) => g.skill).join(", "));
  if ("threshold" in source && source.threshold !== 3) bits.push(`threshold ${source.threshold}`);
  return bits.join(" · ");
}
