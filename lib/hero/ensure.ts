import type { Character } from "../types";
import type { Store } from "../store";
import { heroFromCharacter } from "./legacy";
import type { Hero } from "./types";

/**
 * A character's Hero, built on the spot from its recorded build when it hasn't got one yet (a half-built Hero, like the
 * Database set-up page makes). So a character is never stuck without an editor. If the database refuses it, the reason comes back.
 */
export async function ensureHero(store: Store, character: Character): Promise<{ hero: Hero; created: boolean } | { error: string }> {
  const existing = await store.hero(character.id);
  if (existing) return { hero: existing, created: false };
  const { hero } = heroFromCharacter(character);
  try {
    await store.addHero(character.id, character.player_id, hero);
  } catch (e) {
    const err = e as { message?: string; code?: string; details?: string };
    return { error: [err.message ?? "unknown error", err.code ? `(${err.code})` : "", err.details ?? ""].filter(Boolean).join(" ") };
  }
  // Read it back so what the page shows is what was saved
  const saved = await store.hero(character.id);
  return saved ? { hero: saved, created: true } : { error: "The Hero was not saved" };
}
