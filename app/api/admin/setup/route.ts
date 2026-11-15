import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { heroFromCharacter } from "@/lib/hero/legacy";
import { BUNDLED_CARDS } from "@/lib/hero/cards";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GM only. { action: "cards" } loads the card database; { action: "heroes" } builds a half-built Hero for every character without one. */
export async function POST(req: Request) {
  const role = await getRole();
  if (role !== "gm") return NextResponse.json({ error: role ? "forbidden" : "unauthorised" }, { status: role ? 403 : 401 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const store = getStore();
  try {
    if (action === "cards") return NextResponse.json({ cards: await store.saveCards(BUNDLED_CARDS) });
    if (action === "heroes") {
      const [chars, have] = await Promise.all([store.characters(), store.heroIds()]);
      const haveSet = new Set(have);
      const missing = chars.filter((c) => !haveSet.has(c.id));
      const failed: { name: string; message: string }[] = [];
      let created = 0;
      for (const c of missing) {
        try {
          await store.addHero(c.id, c.player_id, heroFromCharacter(c).hero);
          created++;
        } catch (e) {
          const err = e as { message?: string; code?: string };
          failed.push({ name: c.name, message: `${err.message ?? "unknown"}${err.code ? ` (${err.code})` : ""}` });
        }
      }
      return NextResponse.json({ created, alreadyHad: chars.length - missing.length, failed });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    const err = e as { message?: string; code?: string; hint?: string };
    return NextResponse.json({ error: "database", message: err.message ?? "unknown", code: err.code, hint: err.hint }, { status: 500 });
  }
}
