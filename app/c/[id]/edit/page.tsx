import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Builder } from "@/components/builder/Builder";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/c/${id}/edit`)}`);
  const store = getStore();
  const [character, hero, players] = await Promise.all([store.character(id), store.hero(id), store.players()]);
  if (!character || !hero) notFound();
  return (
    <main>
      <div className="col wide">
        <div className="builder-col">
        <Suspense>
          <Builder
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
