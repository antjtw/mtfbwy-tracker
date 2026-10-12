import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { MAX_DESPAIR } from "@/lib/types";

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
