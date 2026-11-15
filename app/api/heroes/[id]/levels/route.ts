import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { computeHero } from "@/lib/hero/engine";
import { creationIssues, entryComplete, entryProblems, levelInfo, sanitizeEntry } from "@/lib/hero/levelup";
import { trackerPatch } from "@/lib/hero/toCharacter";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Saves one level: { level, entry }. Adds the next level, or fills in an earlier one that is missing its picks. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  const store = getStore();
  const [character, stored] = await Promise.all([store.character(id), store.hero(id)]);
  if (!character || !stored) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { level?: unknown; entry?: unknown };
  const level = Number(body.level);
  if (!Number.isInteger(level)) return NextResponse.json({ error: "invalid_level" }, { status: 400 });
  const info = levelInfo(stored, level);
  if (!info) return NextResponse.json({ error: "invalid_level" }, { status: 400 });
  // Only the next level, or one that is still missing its picks
  if (info.existing && entryComplete(info.existing)) return NextResponse.json({ error: "already_done" }, { status: 409 });
  if (creationIssues(stored).length) return NextResponse.json({ error: "unfinished", issues: creationIssues(stored) }, { status: 409 });

  const entry = sanitizeEntry(body.entry, level);
  if (!entry) return NextResponse.json({ error: "invalid_entry" }, { status: 400 });
  // A rebuilt Hero already records where the level went
  if (info.gainFixed && info.existing) {
    entry.pathId = info.existing.pathId;
    entry.archetypeId = info.existing.archetypeId;
  }
  const problems = entryProblems(info.base, entry);
  if (problems.length) return NextResponse.json({ error: "illegal", issues: problems.map((message) => ({ message })) }, { status: 400 });

  const hero = { ...stored, levelLog: [...stored.levelLog] };
  hero.levelLog[level - 2] = entry;
  const issues = computeHero(hero).issues;
  const complete = issues.length === 0;
  if (complete) hero.imported = undefined;
  try {
    await store.saveHero(id, hero, complete ? trackerPatch(hero, character) : undefined);
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ complete, issues, characterLevel: 1 + hero.levelLog.length });
}
