import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { KINDS } from "@/lib/dyad";
import { despairPool, MAX_DESPAIR } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Every pool's despair (anyone signed in; players only ever see their own pool on screen) */
export async function GET() {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  return NextResponse.json(await getStore().despair());
}

/** GM only: { adventure, value } */
export async function PATCH(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (role !== "gm") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { adventure, value } = body;
  if (typeof adventure !== "string" || !adventure.trim() || adventure.length > 100) {
    return NextResponse.json({ error: "invalid_adventure" }, { status: 400 });
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_DESPAIR) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }
  const saved = await getStore().setDespair(adventure, value);
  return NextResponse.json({ adventure, value: saved });
}

const int = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

/**
 * A player (or the GM) adds Despair from a roll: { characterId, delta (1 to 3), rollId, balance, despair, modifier, penalty, kind, wpDelta }.
 * The pool is worked out from the character, never taken from the client. A repeated rollId adds nothing.
 */
export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const delta = int(b.delta, 1, 3);
  const balance = int(b.balance, 1, 12);
  const despair = int(b.despair, 1, 12);
  const modifier = int(b.modifier, -99, 99);
  const penalty = int(b.penalty, 0, 12);
  const wpDelta = int(b.wpDelta, -12, 12);
  const rollId = typeof b.rollId === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(b.rollId) ? b.rollId : null;
  const kind = typeof b.kind === "string" && (Object.values(KINDS) as string[]).includes(b.kind) ? b.kind : null;
  if (!delta || !balance || !despair || modifier === null || penalty === null || wpDelta === null || !rollId || !kind || typeof b.characterId !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const store = getStore();
  const character = await store.character(b.characterId);
  if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const adventure = despairPool(character);
  try {
    const res = await store.addDespair({ rollId, characterId: character.id, adventure, delta, balance, despair, modifier, penalty, kind, wpDelta });
    return NextResponse.json({ adventure, ...res });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
