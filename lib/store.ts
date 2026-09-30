import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SEED_CHARACTERS, SEED_PLAYERS } from "./seed";
import type { Character, CharacterPatch, Player } from "./types";

export interface Store {
  players(): Promise<Player[]>;
  characters(): Promise<Character[]>;
  character(id: string): Promise<Character | null>;
  update(id: string, patch: CharacterPatch): Promise<Character | null>;
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
  };
}

// ---------- Local JSON fallback (dev only) ----------

const FILE = path.join(process.cwd(), ".data", "store.json");

interface Data {
  players: Player[];
  characters: Character[];
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
