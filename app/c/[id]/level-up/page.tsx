import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LevelUp } from "@/components/builder/LevelUp";
import { PageHeading } from "@/components/PageHeading";
import { getRole } from "@/lib/auth";
import { creationIssues, levelInfo, levelToWorkOn } from "@/lib/hero/levelup";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LevelUpPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ level?: string }> }) {
  const { id } = await params;
  const { level: levelParam } = await searchParams;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/c/${id}/level-up`)}`);
  const store = getStore();
  const [character, hero] = await Promise.all([store.character(id), store.hero(id)]);
  if (!character || !hero) notFound();

  const back = (
    <p className="section"><Link className="standalone" href={`/c/${id}`}>Back to the tracker</Link></p>
  );
  const unfinished = creationIssues(hero);
  if (unfinished.length) {
    return (
      <main>
        <div className="col wide"><div className="builder-col">
          <PageHeading title="Finish your Hero first"><p className="lede">Level-ups build on your starting choices, and a few are still open.</p></PageHeading>
          <ul className="plain-list">{unfinished.map((i, n) => <li key={n}>{i.message}</li>)}</ul>
          <p className="section"><Link className="btn" href={`/c/${id}/edit`}>Finish {character.name}</Link></p>
          {back}
        </div></div>
      </main>
    );
  }
  const level = Number(levelParam) || levelToWorkOn(hero);
  const info = level ? levelInfo(hero, level) : null;
  if (!level || !info) {
    return (
      <main>
        <div className="col wide"><div className="builder-col">
          <PageHeading title="Nothing to level up"><p className="lede">{character.name} is at the highest level, or that level isn’t open yet.</p></PageHeading>
          {back}
        </div></div>
      </main>
    );
  }
  return (
    <main>
      <div className="col wide"><div className="builder-col">
        <Suspense>
          <LevelUp characterId={id} characterName={character.name} hero={hero} level={level} />
        </Suspense>
      </div></div>
    </main>
  );
}
