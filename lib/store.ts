import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SEED_CHARACTERS, SEED_PLAYERS } from "./seed";
import { BUNDLED_CARDS, cardFromRow, cardToRow, type CardRow } from "./hero/cards";
import type { Card, Hero } from "./hero/types";
import type { Character, CharacterPatch, Player } from "./types";

export interface Store {
  players(): Promise<Player[]>;
  characters(): Promise<Character[]>;
  character(id: string): Promise<Character | null>;
  update(id: string, patch: CharacterPatch): Promise<Character | null>;
  /** Despair per campaign or adventure (missing pools read as 0) */
  despair(): Promise<Record<string, number>>;
  setDespair(adventure: string, value: number): Promise<number>;
  /** Adds to a pool (never above 12), once per roll id. A repeated roll id changes nothing. */
  addDespair(roll: RollRecord): Promise<{ value: number; clamped: boolean; applied: boolean }>;
  /** Saves a built Hero together with the tracker character made from it */
  createHero(hero: Hero, character: Character): Promise<void>;
  hero(characterId: string): Promise<Hero | null>;
  /** Moves a character, with its Hero, into the deleted list. Nothing is lost: the full record is kept for the GM. */
  deleteCharacter(id: string, by: string): Promise<DeletedCharacter | null>;
  deletedCharacters(): Promise<DeletedCharacter[]>;
  deletedCharacter(id: string): Promise<DeletedCharacter | null>;
  /** Puts a deleted character, and its Hero, back as they were */
  restoreCharacter(id: string): Promise<"restored" | "exists" | "not_found">;
  /** Saves an edited Hero, and any change to its tracker character in the same go */
  saveHero(characterId: string, hero: Hero, characterPatch?: Partial<Character>): Promise<void>;
  /** Every card, from the database when it has them, otherwise the bundled snapshot */
  cards(): Promise<Card[]>;
  /** Loads the bundled cards into the database (a no-op for the local file store). Returns how many are now there. */
  saveCards(cards: Card[]): Promise<number>;
  /** Ids of characters that already have a Hero */
  heroIds(): Promise<string[]>;
  /** Adds a Hero for an existing character, leaving any Hero already there alone */
  addHero(characterId: string, playerId: string, hero: Hero): Promise<void>;
}

/** Everything about a deleted character, enough to put it back exactly as it was */
export interface DeletedCharacter {
  id: string;
  player_id: string;
  name: string;
  deleted_at: string;
  deleted_by: string;
  character: Character;
  hero: Hero | null;
}

/** A resolved roll, kept as the log and as the guard against adding Despair twice */
export interface RollRecord {
  rollId: string;
  characterId: string;
  adventure: string;
  delta: number;
  balance: number;
  despair: number;
  modifier: number;
  penalty: number;
  kind: string;
  wpDelta: number;
}

// ---------- Supabase ----------

function supabaseStore(url: string, key: string): Store {
  const db = createClient(url, key, { auth: { persistSession: false } });
  return {
    async players() {
      const { data, error } = await db.from("players").select("*").order("sort");
      if (error) throw error;
      return data as Player[];
    },
    async characters() {
      const { data, error } = await db.from("characters").select("*").order("sort");
      if (error) throw error;
      return data as Character[];
    },
    async character(id) {
      const { data, error } = await db.from("characters").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as Character) ?? null;
    },
    async update(id, patch) {
      const { data, error } = await db
        .from("characters")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as Character) ?? null;
    },
    async despair() {
      const { data, error } = await db.from("despair").select("adventure, value");
      if (error) {
        // Table not created yet (migration not run): treat every pool as empty rather than break the page
        if (error.code === "42P01" || error.code === "PGRST205") return {};
        throw error;
      }
      return Object.fromEntries((data ?? []).map((r) => [r.adventure as string, r.value as number]));
    },
    async createHero(hero, character) {
      const { error } = await db.from("characters").insert(character);
      if (error) throw error;
      const saved = await db.from("heroes").insert({ id: character.id, player_id: character.player_id, rules_version: hero.rulesVersion, data: hero });
      if (saved.error) {
        await db.from("characters").delete().eq("id", character.id); // don't leave a character with no Hero behind
        throw saved.error;
      }
    },
    async cards() {
      const { data, error } = await db.from("cards").select("*").order("sort");
      if (error || !data?.length) return BUNDLED_CARDS; // table not created or not loaded yet
      return (data as CardRow[]).map(cardFromRow);
    },
    async saveCards(cards) {
      const rows = cards.map(cardToRow);
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await db.from("cards").upsert(rows.slice(i, i + 100));
        if (error) throw error;
      }
      const { data, error } = await db.from("cards").select("id");
      if (error) throw error;
      const keep = new Set(rows.map((r) => r.id));
      const stale = (data ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
      for (let i = 0; i < stale.length; i += 50) {
        const del = await db.from("cards").delete().in("id", stale.slice(i, i + 50));
        if (del.error) throw del.error;
      }
      return rows.length;
    },
    async heroIds() {
      const { data, error } = await db.from("heroes").select("id");
      if (error) throw error;
      return (data ?? []).map((r) => r.id as string);
    },
    async addHero(characterId, playerId, hero) {
      const { error } = await db.from("heroes").upsert(
        { id: characterId, player_id: playerId, rules_version: hero.rulesVersion, data: hero },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    async saveHero(characterId, hero, characterPatch) {
      const { error } = await db.from("heroes").update({ rules_version: hero.rulesVersion, data: hero, updated_at: new Date().toISOString() }).eq("id", characterId);
      if (error) throw error;
      if (characterPatch) {
        const res = await db.from("characters").update({ ...characterPatch, updated_at: new Date().toISOString() }).eq("id", characterId);
        if (res.error) throw res.error;
      }
    },
    async deleteCharacter(id, by) {
      const [c, h] = await Promise.all([db.from("characters").select("*").eq("id", id).maybeSingle(), db.from("heroes").select("data").eq("id", id).maybeSingle()]);
      if (c.error) throw c.error;
      if (!c.data) return null;
      const record = { id, player_id: c.data.player_id as string, name: c.data.name as string, deleted_by: by, character: c.data, hero: (h.data?.data as Hero | undefined) ?? null };
      // Keep the record first: if it can't be kept, nothing is deleted
      const kept = await db.from("deleted_characters").upsert(record).select("*").single();
      if (kept.error) throw kept.error;
      const del = await db.from("characters").delete().eq("id", id); // the Hero goes with it
      if (del.error) throw del.error;
      return kept.data as DeletedCharacter;
    },
    async deletedCharacters() {
      const { data, error } = await db.from("deleted_characters").select("*").order("deleted_at", { ascending: false });
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") return [];
        throw error;
      }
      return data as DeletedCharacter[];
    },
    async deletedCharacter(id) {
      const { data, error } = await db.from("deleted_characters").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as DeletedCharacter) ?? null;
    },
    async restoreCharacter(id) {
      const rec = await this.deletedCharacter(id);
      if (!rec) return "not_found";
      const exists = await db.from("characters").select("id").eq("id", id).maybeSingle();
      if (exists.data) return "exists";
      const c = await db.from("characters").insert(rec.character);
      if (c.error) throw c.error;
      if (rec.hero) {
        const h = await db.from("heroes").insert({ id, player_id: rec.player_id, rules_version: rec.hero.rulesVersion, data: rec.hero });
        if (h.error) {
          await db.from("characters").delete().eq("id", id); // don't leave half of it back
          throw h.error;
        }
      }
      const gone = await db.from("deleted_characters").delete().eq("id", id);
      if (gone.error) throw gone.error;
      return "restored";
    },
    async hero(characterId) {
      const { data, error } = await db.from("heroes").select("data").eq("id", characterId).maybeSingle();
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") return null;
        throw error;
      }
      return (data?.data as Hero) ?? null;
    },
    async addDespair(r) {
      const { data, error } = await db.rpc("add_despair", {
        p_roll_id: r.rollId, p_character_id: r.characterId, p_adventure: r.adventure, p_delta: r.delta,
        p_balance: r.balance, p_despair: r.despair, p_modifier: r.modifier, p_penalty: r.penalty, p_kind: r.kind, p_wp_delta: r.wpDelta,
      });
      if (!error) {
        const row = (Array.isArray(data) ? data[0] : data) as { value: number; clamped: boolean; applied: boolean };
        return { value: row.value, clamped: row.clamped, applied: row.applied };
      }
      // The migration hasn't been run: add to the pool directly (not atomic, and a retry could add twice)
      if (error.code !== "42883" && error.code !== "PGRST202" && error.code !== "42P01") throw error;
      const cur = await db.from("despair").select("value").eq("adventure", r.adventure).maybeSingle();
      if (cur.error) throw cur.error;
      const before = (cur.data?.value as number | undefined) ?? 0;
      const value = Math.min(12, before + r.delta);
      const up = await db.from("despair").upsert({ adventure: r.adventure, value, updated_at: new Date().toISOString() });
      if (up.error) throw up.error;
      return { value, clamped: before + r.delta > 12, applied: true };
    },
    async setDespair(adventure, value) {
      const { data, error } = await db
        .from("despair")
        .upsert({ adventure, value, updated_at: new Date().toISOString() })
        .select("value")
        .single();
      if (error) throw error;
      return data.value as number;
    },
  };
}

// ---------- Local JSON fallback (dev only) ----------

const FILE = path.join(process.cwd(), ".data", "store.json");

interface Data {
  players: Player[];
  characters: Character[];
  despair?: Record<string, number>;
  rolls?: Record<string, RollRecord>;
  deleted?: DeletedCharacter[];
  heroes?: Record<string, Hero>;
}

async function load(): Promise<Data> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (e) {
    // Only a missing file means "start from the seed"; anything else is a real error
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { players: SEED_PLAYERS, characters: SEED_CHARACTERS };
    }
    throw e;
  }
}

async function save(data: Data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  // Write then rename so readers never see a half-written file
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, FILE);
}

function fileStore(): Store {
  // Serialise writes so concurrent taps don't clobber each other
  let queue: Promise<unknown> = Promise.resolve();
  return {
    async players() {
      return (await load()).players;
    },
    async characters() {
      return (await load()).characters;
    },
    async character(id) {
      return (await load()).characters.find((x) => x.id === id) ?? null;
    },
    update(id, patch) {
      const run = queue.then(async () => {
        const data = await load();
        const ch = data.characters.find((x) => x.id === id);
        if (!ch) return null;
        Object.assign(ch, patch);
        await save(data);
        return ch;
      });
      queue = run.catch(() => undefined);
      return run;
    },
    async despair() {
      return (await load()).despair ?? {};
    },
    createHero(hero, character) {
      const run = queue.then(async () => {
        const data = await load();
        if (data.characters.some((c) => c.id === character.id)) throw new Error("exists");
        data.characters.push(character);
        data.heroes = { ...data.heroes, [character.id]: hero };
        await save(data);
      });
      queue = run.catch(() => undefined);
      return run;
    },
    deleteCharacter(id, by) {
      const run = queue.then(async () => {
        const data = await load();
        const c = data.characters.find((x) => x.id === id);
        if (!c) return null;
        const rec: DeletedCharacter = { id, player_id: c.player_id, name: c.name, deleted_at: new Date().toISOString(), deleted_by: by, character: c, hero: data.heroes?.[id] ?? null };
        data.deleted = [rec, ...(data.deleted ?? []).filter((x) => x.id !== id)];
        data.characters = data.characters.filter((x) => x.id !== id);
        if (data.heroes) delete data.heroes[id];
        await save(data);
        return rec;
      });
      queue = run.catch(() => undefined);
      return run;
    },
    async deletedCharacters() {
      return (await load()).deleted ?? [];
    },
    async deletedCharacter(id) {
      return ((await load()).deleted ?? []).find((x) => x.id === id) ?? null;
    },
    restoreCharacter(id) {
      const run = queue.then(async (): Promise<"restored" | "exists" | "not_found"> => {
        const data = await load();
        const rec = (data.deleted ?? []).find((x) => x.id === id);
        if (!rec) return "not_found";
        if (data.characters.some((x) => x.id === id)) return "exists";
        data.characters.push(rec.character);
        if (rec.hero) data.heroes = { ...data.heroes, [id]: rec.hero };
        data.deleted = (data.deleted ?? []).filter((x) => x.id !== id);
        await save(data);
        return "restored";
      });
      queue = run.catch(() => undefined);
      return run;
    },
    async hero(characterId) {
      return (await load()).heroes?.[characterId] ?? null;
    },
    saveHero(characterId, hero, characterPatch) {
      const run = queue.then(async () => {
        const data = await load();
        data.heroes = { ...data.heroes, [characterId]: hero };
        if (characterPatch) data.characters = data.characters.map((c) => (c.id === characterId ? { ...c, ...characterPatch } : c));
        await save(data);
      });
      queue = run.catch(() => undefined);
      return run;
    },
    async cards() {
      return BUNDLED_CARDS;
    },
    async saveCards(cards) {
      return cards.length;
    },
    async heroIds() {
      return Object.keys((await load()).heroes ?? {});
    },
    addHero(characterId, _playerId, hero) {
      const run = queue.then(async () => {
        const data = await load();
        if (data.heroes?.[characterId]) return;
        data.heroes = { ...data.heroes, [characterId]: hero };
        await save(data);
      });
      queue = run.catch(() => undefined);
      return run;
    },
    addDespair(r) {
      const run = queue.then(async () => {
        const data = await load();
        const seen = (data.rolls ??= {});
        const before = data.despair?.[r.adventure] ?? 0;
        if (seen[r.rollId]) return { value: before, clamped: false, applied: false };
        seen[r.rollId] = r;
        const value = Math.min(12, before + r.delta);
        data.despair = { ...data.despair, [r.adventure]: value };
        await save(data);
        return { value, clamped: before + r.delta > 12, applied: true };
      });
      queue = run.catch(() => undefined);
      return run;
    },
    setDespair(adventure, value) {
      const run = queue.then(async () => {
        const data = await load();
        data.despair = { ...data.despair, [adventure]: value };
        await save(data);
        return value;
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}

const g = globalThis as unknown as { __store?: Store };

export function getStore(): Store {
  if (!g.__store) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    g.__store = url && key ? supabaseStore(url, key) : fileStore();
  }
  return g.__store;
}
