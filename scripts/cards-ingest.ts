/*
 * Turns the Abilities sheet dump (lib/hero/data/sources/abilities-sheet.json) into:
 *   lib/hero/data/cards.json   the normalised cards the app reads
 *   (cards are loaded into the database from /admin/setup)
 * Refresh: re-dump the sheet's values into abilities-sheet.json, then `npm run cards:ingest`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ARCHETYPE_FEATURES } from "../lib/hero/data/archetypeFeatures";
import type { Card, CardPrerequisite, Tradition } from "../lib/hero/types";

const dump = JSON.parse(readFileSync(new URL("../lib/hero/data/sources/abilities-sheet.json", import.meta.url), "utf8")) as { values: string[][] };
const slug = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const [, ...rows] = dump.values;
const raw = rows.map((r) => Array.from({ length: 9 }, (_, i) => (r[i] ?? "").trim())).filter((r) => r[4]);

const traditionOf = (s: string): Tradition | null => (/^force/i.test(s) ? "force" : /^magick/i.test(s) ? "magick" : /^tech/i.test(s) ? "tech" : null);

// Archetype features by lower-cased name, for resolving prerequisites
const featureByName = new Map<string, string>();
for (const [key, feats] of Object.entries(ARCHETYPE_FEATURES)) for (const f of feats) featureByName.set(f.name.toLowerCase(), `${key}:${slug(f.name)}`);

const used = new Set<string>();
const cards: Card[] = raw.map((r, i) => {
  const [source, pathRaw, archetype, tier, name, content, prereq, roll, cost] = r;
  const sourceType = /^path of/i.test(source) ? "path" : /^the career/i.test(source) ? "career" : "tradition";
  const path = sourceType === "tradition" ? "" : pathRaw;
  let id = [sourceType === "tradition" ? slug(source) : slug(path || "none"), slug(archetype || "none"), slug(name)].join(".");
  for (let n = 2; used.has(id); n++) id = `${id.replace(/-\d+$/, "")}-${n}`;
  used.add(id);
  const m = cost.match(/^(\d+)\b/);
  return {
    id,
    sourceType,
    sourceName: sourceType === "path" ? pathRaw : sourceType === "career" ? pathRaw : source,
    path,
    archetype,
    tier: Number(tier) as Card["tier"],
    name,
    content,
    prerequisiteText: prereq,
    actionRoll: (["Yes", "No", "Conditional"].includes(roll) ? roll : "No") as Card["actionRoll"],
    willpowerCost: m ? Number(m[1]) : /^none$/i.test(cost) || !cost ? 0 : null,
    willpowerCostText: cost,
    sort: i + 1,
  };
});

const cardIdByName = new Map<string, string>();
for (const c of cards) if (!cardIdByName.has(c.name.toLowerCase())) cardIdByName.set(c.name.toLowerCase(), c.id);

// Powers that live inside a Basic power card rather than on a card of their own
const ALIASES: Record<string, string> = { evade: "Basic Force powers" };

const unresolved: string[] = [];
for (const c of cards) {
  const t = c.prerequisiteText;
  if (!t) continue;
  let p: CardPrerequisite;
  const trad = /casting$/i.test(t) ? traditionOf(t) : null;
  if (trad) p = { kind: "casting", tradition: trad };
  else if (/^(fury|assess)$/i.test(t)) p = { kind: "path_feature", name: t };
  else if (featureByName.has(t.toLowerCase())) p = { kind: "archetype_feature", name: t, featureKey: featureByName.get(t.toLowerCase())! };
  else if (cardIdByName.has((ALIASES[t.toLowerCase()] ?? t).toLowerCase())) {
    const target = ALIASES[t.toLowerCase()] ?? t;
    p = { kind: "card", name: target, cardId: cardIdByName.get(target.toLowerCase())! };
  }
  else {
    p = { kind: "unresolved", text: t };
    unresolved.push(`${c.id}: ${t}`);
  }
  c.prerequisite = p;
}

writeFileSync(new URL("../lib/hero/data/cards.json", import.meta.url), JSON.stringify(cards, null, 1));

