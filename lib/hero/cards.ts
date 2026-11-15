import bundled from "./data/cards.json";
import type { Card } from "./types";

/** The cards as last ingested from the Abilities sheet. The database copy is read first when it exists. */
export const BUNDLED_CARDS = bundled as Card[];

/** A row of the `cards` table, as Supabase returns it */
export interface CardRow {
  id: string;
  source_type: Card["sourceType"];
  source_name: string;
  path: string;
  archetype: string;
  tier: number;
  name: string;
  content: string;
  prerequisite_text: string;
  prerequisite: Card["prerequisite"] | null;
  action_roll: Card["actionRoll"];
  willpower_cost: number | null;
  willpower_cost_note: string;
  sort: number;
}

export function cardFromRow(r: CardRow): Card {
  return {
    id: r.id,
    sourceType: r.source_type,
    sourceName: r.source_name,
    path: r.path,
    archetype: r.archetype,
    tier: r.tier as Card["tier"],
    name: r.name,
    content: r.content,
    prerequisiteText: r.prerequisite_text,
    prerequisite: r.prerequisite ?? undefined,
    actionRoll: r.action_roll,
    willpowerCost: r.willpower_cost,
    willpowerCostText: r.willpower_cost_note,
    sort: r.sort,
  };
}

/** Where a card sits, for filters and headings: "Sentinel · Blademaster", "Force casting", "Vanguard" */
export const cardGroup = (c: Card) => [c.sourceType === "tradition" ? c.sourceName : c.path || c.sourceName, c.archetype].filter(Boolean).join(" · ");

export function cardToRow(c: Card): CardRow & { rules_version: string } {
  return {
    id: c.id,
    source_type: c.sourceType,
    source_name: c.sourceName,
    path: c.path,
    archetype: c.archetype,
    tier: c.tier,
    name: c.name,
    content: c.content,
    prerequisite_text: c.prerequisiteText,
    prerequisite: c.prerequisite ?? null,
    action_roll: c.actionRoll,
    willpower_cost: c.willpowerCost,
    willpower_cost_note: c.willpowerCostText,
    sort: c.sort,
    rules_version: "1.2.0",
  };
}
