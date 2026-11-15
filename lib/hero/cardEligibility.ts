import { ARCHETYPE_FEATURES, PATH_BY_ID } from "./data";
import { computeHero, TIER0_KEY, tierOf } from "./engine";
import { type Card, type Derived, type Hero, type LevelEntry, type PendingCard, type Tradition } from "./types";

/*
 * Which cards a Hero can take when a level earns one (spec 5.4 step 4, R-CARD-1 to R-CARD-5):
 * from the Archetype that gained the level or its Path, at the level's tier or lower (one lower for a Path
 * entered by Multi-path), once any prerequisite is met, and never one the Hero already has.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface CardOption {
  card: Card;
  eligible: boolean;
  /** Why it can't be taken yet */
  reason?: string;
}

/** The first character level at which a tier opens up */
const TIER_FROM_LEVEL: Record<number, number> = { 0: 1, 1: 2, 2: 5, 3: 9 };

/** Cards the Hero has: every chosen card, plus the Basic power bundles their traditions grant */
export function ownedCardIds(hero: Hero, d: Derived, cards: readonly Card[]): Set<string> {
  const owned = new Set<string>(hero.levelLog.flatMap((e) => (e.cardId ? [e.cardId] : [])));
  const extra = hero.choices[TIER0_KEY];
  for (const id of Array.isArray(extra) ? extra : []) owned.add(id);
  const basic: Record<Tradition, string> = { force: "force-casting.none.basic-force-powers", magick: "magick-casting.none.basic-magick-powers", tech: "tech-casting.none.basic-tech-powers" };
  for (const t of d.powers.traditions) if (cards.some((c) => c.id === basic[t])) owned.add(basic[t]);
  return owned;
}

/** The card due for this level, if any, given the Hero before the level and the entry for it */
export function cardDue(base: Hero, entry: LevelEntry): PendingCard | null {
  const d = computeHero({ ...base, levelLog: [...base.levelLog, { ...entry, cardId: undefined }] });
  return d.pendingCards.find((p) => p.level === entry.characterLevel) ?? null;
}

export function cardOptions(base: Hero, entry: LevelEntry, cards: readonly Card[]): { due: PendingCard | null; options: CardOption[] } {
  const due = cardDue(base, entry);
  if (!due) return { due, options: [] };
  const level = entry.characterLevel;
  // The Hero as they stand after this level (without a card yet), for prerequisites
  const after = computeHero({ ...base, levelLog: [...base.levelLog, { ...entry, cardId: undefined }] });
  const owned = ownedCardIds(base, computeHero(base), cards);

  const path = PATH_BY_ID[due.pathId];
  const archetype = path?.archetypes.find((a) => a.id === due.archetypeId);
  const entered = due.pathId !== base.path.id; // a Path reached by Multi-path
  const ceiling = Math.max(0, tierOf(level) - (entered ? 1 : 0));

  const pool = cards.filter(
    (c) => c.sourceType === "path" && slug(c.path) === slug(path?.name ?? "") && (c.archetype === "" || slug(c.archetype) === slug(archetype?.name ?? due.archetypeId)),
  );

  const hasFeature = (featureKey: string) => {
    const [arch, slugName] = featureKey.split(":");
    const f = ARCHETYPE_FEATURES[arch]?.find((x) => slug(x.name) === slugName);
    const [pathId, archetypeId] = arch.split("/");
    const a = after.paths.find((p) => p.pathId === pathId)?.archetypes.find((x) => x.archetypeId === archetypeId);
    return !!f && !!a && a.level >= f.level;
  };

  const options = pool.map((card): CardOption => {
    if (owned.has(card.id)) return { card, eligible: false, reason: "You already have this card" };
    if (card.tier > ceiling) {
      const open = Object.entries(TIER_FROM_LEVEL).find(([t]) => Number(t) === card.tier + (entered ? 1 : 0))?.[1] ?? 9;
      return { card, eligible: false, reason: `Tier ${card.tier}, available from level ${open}${entered ? " on a path you branched into" : ""}` };
    }
    const p = card.prerequisite;
    if (p) {
      if (p.kind === "casting" && !after.powers.traditions.includes(p.tradition as Tradition) && !after.casting.some((c) => c.kind.toLowerCase().startsWith(p.tradition))) {
        return { card, eligible: false, reason: `Needs ${p.tradition} casting` };
      }
      if (p.kind === "path_feature") {
        const pathFor = p.name === "Fury" ? "marauder" : p.name === "Assess" ? "vanguard" : "";
        if (pathFor && !after.paths.some((x) => x.pathId === pathFor)) return { card, eligible: false, reason: `Needs ${p.name}` };
      }
      if (p.kind === "archetype_feature" && !hasFeature(p.featureKey)) return { card, eligible: false, reason: `Needs ${p.name}` };
      if (p.kind === "card" && !owned.has(p.cardId)) return { card, eligible: false, reason: `Needs ${p.name}` };
      if (p.kind === "unresolved") return { card, eligible: false, reason: `Needs ${p.text}` };
    }
    return { card, eligible: true };
  });
  // Available first, then by tier and the sheet's own order
  options.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.card.tier - b.card.tier || a.card.sort - b.card.sort);
  return { due, options };
}

/** Problems with the card chosen (or missing) on an entry */
export function cardProblems(base: Hero, entry: LevelEntry, cards: readonly Card[]): string[] {
  const { due, options } = cardOptions(base, entry, cards);
  if (!due) return entry.cardId ? [`Level ${entry.characterLevel} doesn't earn a card`] : [];
  if (!entry.cardId) return [`Level ${entry.characterLevel}: choose a card`];
  const o = options.find((x) => x.card.id === entry.cardId);
  if (!o) return [`Level ${entry.characterLevel}: that card isn't on ${PATH_BY_ID[due.pathId]?.name ?? "your path"}`];
  return o.eligible ? [] : [`Level ${entry.characterLevel}: ${o.card.name}: ${o.reason}`];
}
