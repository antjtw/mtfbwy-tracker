import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { buildSheet, keysToClear } from "@/lib/hero/sheet";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Spends or restores a once-per ability or a use: { key, value }, or clears a rest's worth: { rest: "short" | "full" } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const store = getStore();
  const hero = await store.hero(id);
  if (!hero) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const sheet = buildSheet(hero);
  const body = (await req.json().catch(() => ({}))) as { key?: unknown; value?: unknown; rest?: unknown };
  const used = { ...(hero.play?.used ?? {}) };

  if (body.rest === "short" || body.rest === "full") {
    for (const k of keysToClear(sheet, body.rest)) delete used[k];
  } else if (typeof body.key === "string" && Number.isInteger(body.value)) {
    const ability = sheet.abilities.find((a) => `ability:${a.key}` === body.key && a.per);
    const resource = sheet.resources.find((r) => r.key === body.key && r.spendable);
    const max = ability ? 1 : resource ? resource.count : 0;
    if (!ability && !resource) return NextResponse.json({ error: "unknown_key" }, { status: 400 });
    const v = Math.max(0, Math.min(max, body.value as number));
    if (v === 0) delete used[body.key];
    else used[body.key] = v;
  } else return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    await store.saveHero(id, { ...hero, play: { used } });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ used });
}
