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
 * The line under a character's name. A Hero with an origin or Path reads species, origin, Path (Archetype level)
 * and career, leaving out whatever isn't recorded. One with neither falls back to what was
 * written about them (or just their species), their career if they have one, and their era.
 */
export function buildParts(ch: Character): BuildPart[] {
  const paths = ch.paths ?? [];
  if (ch.origin || paths.length) {
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
  return [
    about && { key: "about", label: "About", text: about },
    ch.career && { key: "career", label: "Career", text: ch.career },
    era && { key: "era", label: "Era", text: era },
  ].filter(Boolean) as BuildPart[];
}

/**
 * The one-line description used on the character lists: "[Origin] [Species], [Archetype] [Path], [Career]"
 * (e.g. "Jedi Initiate Pkorian, Embalmed Sorcerer, Jedi Knight"). More than one Path is separated by " / ",
 * and parts that aren't recorded are left out. Empty without an origin or Path, so the written description stays.
 */
export function describeBuild(b: Build): string {
  const who = [b.origin, b.species].filter(Boolean).join(" ");
  const path = b.paths.map((p) => `${p.archetypes.map((a) => a.name).join(" / ")} ${p.path}`).join(" / ");
  return b.origin || b.paths.length ? [who, path, b.career].filter(Boolean).join(", ") : "";
}
