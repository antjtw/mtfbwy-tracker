import { createClient } from "@supabase/supabase-js";
import { SEED_CHARACTERS, SEED_PLAYERS } from "../lib/seed";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");

const db = createClient(url, key, { auth: { persistSession: false } });

// Upsert keeps live slot usage intact only if you omit the *_used columns, so strip them
const characters = SEED_CHARACTERS.map(({ hp_used, wp_used, ar_used, ...rest }) => rest);

const p = await db.from("players").upsert(SEED_PLAYERS);
if (p.error) throw p.error;
const c = await db.from("characters").upsert(characters);
if (c.error) throw c.error;
console.log(`Seeded ${SEED_PLAYERS.length} players and ${characters.length} characters.`);
