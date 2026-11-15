import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GM only: the deleted character as a JSON file, everything needed to add it back by hand */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if ((await getRole()) !== "gm") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const rec = await getStore().deletedCharacter(id);
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(JSON.stringify(rec, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="deleted-${rec.id}.json"` },
  });
}

/** GM only: puts the character back, with its Hero, as it was */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if ((await getRole()) !== "gm") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const res = await getStore().restoreCharacter(id);
    if (res === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (res === "exists") return NextResponse.json({ error: "exists" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as { message?: string; code?: string };
    return NextResponse.json({ error: "restore_failed", message: err.message ?? "unknown", code: err.code }, { status: 500 });
  }
}
