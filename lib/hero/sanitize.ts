import { emptyHero } from "./engine";
import { type Hero, RULES_VERSION, TRAITS } from "./types";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Rebuilds a Hero from untrusted JSON, keeping only the fields the builder sets and trimming lengths.
 * The engine then judges whether the decisions are valid.
 */
export function sanitizeHero(raw: unknown): Hero | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  const h = emptyHero();
  h.rulesVersion = RULES_VERSION;
  h.startingLevel = 1;
  h.species = { id: str(r.species?.id, 60), subspeciesId: r.species?.subspeciesId ? str(r.species.subspeciesId, 60) : undefined };
  h.origin = { id: str(r.origin?.id, 60) };
  h.path = { id: str(r.path?.id, 60), archetypeId: str(r.path?.archetypeId, 60) };
  h.career = { id: str(r.career?.id, 60) };
  for (const t of TRAITS) {
    const v = r.traitArray?.[t];
    h.traitArray[t] = Number.isInteger(v) ? v : 0;
  }
  const choices: Hero["choices"] = {};
  if (r.choices && typeof r.choices === "object") {
    for (const [k, v] of Object.entries(r.choices as Record<string, unknown>).slice(0, 60)) {
      if (typeof v === "string") choices[str(k, 120)] = v.slice(0, 200);
      else if (Array.isArray(v)) choices[str(k, 120)] = v.filter((x): x is string => typeof x === "string").slice(0, 6).map((x) => x.slice(0, 60));
    }
  }
  h.choices = choices;
  h.levelLog = []; // the builder starts every Hero at level 1; level-up is its own flow
  h.identity = {
    name: str(r.identity?.name, 80).trim(),
    backstory: str(r.identity?.backstory, 5000),
    languages: str(r.identity?.languages, 300),
    notes: str(r.identity?.notes, 2000),
  };
  return h;
}

/** An edit keeps what the builder doesn't touch (level, level-up log, imported flag) from the stored Hero */
export function sanitizeHeroEdit(raw: unknown, stored: Hero): Hero | null {
  const h = sanitizeHero(raw);
  if (!h) return null;
  h.startingLevel = stored.startingLevel;
  h.levelLog = stored.levelLog;
  if (stored.imported) h.imported = true;
  return h;
}
