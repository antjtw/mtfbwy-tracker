import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { computeHero } from "@/lib/hero/engine";
import { sanitizeHeroEdit } from "@/lib/hero/sanitize";
import { trackerPatch } from "@/lib/hero/toCharacter";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Saves an edited Hero: { hero }. Half-built Heroes can be saved as they are, so progress isn't lost;
 * the tracker's slots and build line only follow the Hero once it has nothing left to sort.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const store = getStore();
  const [character, stored] = await Promise.all([store.character(id), store.hero(id)]);
  if (!character || !stored) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { hero?: unknown };
  const hero = sanitizeHeroEdit(body.hero, stored);
  if (!hero) return NextResponse.json({ error: "invalid_hero" }, { status: 400 });
  if (!hero.identity.name) return NextResponse.json({ error: "incomplete", issues: [{ code: "missing", message: "Give your Hero a name" }] }, { status: 400 });

  const issues = computeHero(hero).issues;
  const complete = issues.length === 0;
  if (complete) hero.imported = undefined;
  try {
    await store.saveHero(id, hero, complete ? trackerPatch(hero, character) : { name: hero.identity.name });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ complete, issues });
}
