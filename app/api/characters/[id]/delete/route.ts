import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** The exact word that has to be typed before a character can be deleted */
const DELETE_WORD = "DELETE";

/**
 * Deletes a character: { confirm: "DELETE" }. It leaves the player's list and the tracker, but the full record (character
 * and Hero) is kept for the GM, who can bring it back.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== DELETE_WORD) return NextResponse.json({ error: "not_confirmed" }, { status: 400 });
  try {
    const kept = await getStore().deleteCharacter(id, role);
    if (!kept) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, name: kept.name, playerId: kept.player_id });
  } catch (e) {
    const err = e as { message?: string; code?: string };
    // If the record couldn't be kept, nothing was deleted
    return NextResponse.json({ error: "not_kept", message: err.message ?? "unknown", code: err.code }, { status: 500 });
  }
}
