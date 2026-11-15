import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { computeHero } from "@/lib/hero/engine";
import { sanitizeHero } from "@/lib/hero/sanitize";
import { characterFromHero } from "@/lib/hero/toCharacter";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Creates a Hero and its tracker character: { playerId, hero } */
export async function POST(req: Request) {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { playerId?: unknown; hero?: unknown; adventure?: unknown };
  const store = getStore();
  const [players, chars] = await Promise.all([store.players(), store.characters()]);
  const player = players.find((p) => p.id === body.playerId);
  if (!player) return NextResponse.json({ error: "unknown_player" }, { status: 400 });

  // An adventure the GM already runs, or none ("add later")
  const adventure = typeof body.adventure === "string" ? body.adventure : "";
  if (adventure && !chars.some((c) => c.adventures.includes(adventure))) return NextResponse.json({ error: "unknown_adventure" }, { status: 400 });

  const hero = sanitizeHero(body.hero);
  if (!hero) return NextResponse.json({ error: "invalid_hero" }, { status: 400 });
  const issues = computeHero(hero).issues;
  if (!hero.identity.name) issues.push({ code: "missing", message: "Give your Hero a name" });
  if (issues.length) return NextResponse.json({ error: "incomplete", issues }, { status: 400 });

  const character = characterFromHero(hero, player.id, new Set(chars.map((c) => c.id)), Math.max(0, ...chars.map((c) => c.sort)) + 1, adventure);
  try {
    await store.createHero(hero, character);
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ id: character.id }, { status: 201 });
}
