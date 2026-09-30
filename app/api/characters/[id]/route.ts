import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { MAX_SLOTS, type CharacterPatch } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const USED = ["hp_used", "wp_used", "ar_used"] as const;
const MAX = ["hp_max", "wp_max", "ar_max"] as const;

export async function GET(_req: Request, { params }: Ctx) {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const ch = await getStore().character((await params).id);
  return ch ? NextResponse.json(ch) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const store = getStore();
  const current = await store.character((await params).id);
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: CharacterPatch = {};

  for (const key of [...USED, ...MAX]) {
    if (!(key in body)) continue;
    if ((MAX as readonly string[]).includes(key) && role !== "gm") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const v = body[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > MAX_SLOTS) {
      return NextResponse.json({ error: "invalid_value", field: key }, { status: 400 });
    }
    patch[key] = v;
  }

  // Keep used <= max, clamping used down when a max is lowered
  for (const t of ["hp", "wp", "ar"] as const) {
    const max = patch[`${t}_max`] ?? current[`${t}_max`];
    const used = patch[`${t}_used`] ?? current[`${t}_used`];
    if (used > max) {
      if (`${t}_used` in patch && !(`${t}_max` in patch)) {
        return NextResponse.json({ error: "exceeds_max", field: `${t}_used` }, { status: 400 });
      }
      patch[`${t}_used`] = max;
    }
  }

  const updated = await store.update(current.id, patch);
  return NextResponse.json(updated);
}
