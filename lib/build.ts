import type { Build } from "./builds";
import type { Character } from "./types";

/** Era shown for a character with no build recorded, by the adventure they belong to */
const ADVENTURE_ERAS: Record<string, string> = {
  "Quest of the Jedi": "High Republic era",
  "Ride the Storm": "High Republic era",
  "Underworld Train Heist": "Imperial era",
  "Nexu Crew": "Imperial era",
};

export interface BuildPart {
  key: string;
  /** Spoken to screen readers ahead of the text */
  label: string;
  text: string;
}

/**
 * The line under a character's name. A Hero with a build reads species, origin, Path (Archetype level)
 * and career, leaving out whatever isn't recorded. One with no build at all falls back to what was
 * written about them (or just their species), a role for Nexu Crew regulars, and their era.
 */
export function buildParts(ch: Character): BuildPart[] {
  const paths = ch.paths ?? [];
  if (ch.origin || ch.career || paths.length) {
    return [
      ch.species && { key: "species", label: "Species", text: ch.species },
      ch.origin && { key: "origin", label: "Origin", text: ch.origin },
      ...paths.map((p) => ({
        key: p.path,
        label: "Path",
        text: `${p.path} (${p.archetypes.map((a) => `${a.name} ${a.level}`).join(", ")})`,
      })),
      ch.career && { key: "career", label: "Career", text: ch.career },
    ].filter(Boolean) as BuildPart[];
  }

  const about = ch.description && ch.description !== ch.species ? ch.description : ch.species;
  const era = ch.adventures.map((a) => ADVENTURE_ERAS[a]).find(Boolean) ?? ch.era;
  const bareNexu = ch.adventures.includes("Nexu Crew") && about === ch.species;
  return [
    about && { key: "about", label: "About", text: about },
    bareNexu && { key: "role", label: "Role", text: "Pod racer" },
    era && { key: "era", label: "Era", text: era },
  ].filter(Boolean) as BuildPart[];
}

/**
 * The one-line description used on the character lists: "[Origin] [Species], [Archetype] [Path], [Career]"
 * (e.g. "Jedi Initiate Pkorian, Embalmed Sorcerer, Jedi Knight"). More than one Path is separated by " / ",
 * and parts that aren't recorded are left out. Empty when there's no build to describe.
 */
export function describeBuild(b: Build): string {
  const who = [b.origin, b.species].filter(Boolean).join(" ");
  const path = b.paths.map((p) => `${p.archetypes.map((a) => a.name).join(" / ")} ${p.path}`).join(" / ");
  return b.origin || b.career || b.paths.length ? [who, path, b.career].filter(Boolean).join(", ") : "";
}
