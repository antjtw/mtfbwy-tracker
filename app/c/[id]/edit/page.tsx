import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Builder } from "@/components/builder/Builder";
import Link from "next/link";
import { PageHeading } from "@/components/PageHeading";
import { getRole } from "@/lib/auth";
import { ensureHero } from "@/lib/hero/ensure";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/c/${id}/edit`)}`);
  const store = getStore();
  const [character, players, allCards] = await Promise.all([store.character(id), store.players(), store.cards()]);
  if (!character) notFound();
  // A character with no Hero yet gets one built from its recorded build
  const got = await ensureHero(store, character);
  if ("error" in got) {
    return (
      <main>
        <div className="col wide"><div className="builder-col">
          <PageHeading title="Couldn’t open the editor"><p className="lede">{character.name} doesn’t have a Hero yet and one couldn’t be created.</p></PageHeading>
          <p className="err-text" role="alert">{got.error}</p>
          <p className="section"><Link className="standalone" href={`/c/${id}`}>Back to the tracker</Link></p>
        </div></div>
      </main>
    );
  }
  const hero = got.hero;
  return (
    <main>
      <div className="col wide">
        <div className="builder-col">
        <Suspense>
          <Builder
            cards={allCards.filter((c) => c.tier === 0)}
            playerId={character.player_id}
            playerName={players.find((p) => p.id === character.player_id)?.name ?? ""}
            adventures={[]}
            edit={{ characterId: id, hero }}
          />
        </Suspense>
        </div>
      </div>
    </main>
  );
}
