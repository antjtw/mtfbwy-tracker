import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Builder } from "@/components/builder/Builder";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { CURRENT_ADVENTURES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/p/${id}/new`)}`);
  const store = getStore();
  const [players, chars] = await Promise.all([store.players(), store.characters()]);
  const player = players.find((p) => p.id === id);
  if (!player) notFound();
  // Current campaigns first, then the rest alphabetically
  const adventures = [...new Set(chars.flatMap((c) => c.adventures))].sort(
    (a, b) => Number(CURRENT_ADVENTURES.includes(b)) - Number(CURRENT_ADVENTURES.includes(a)) || a.localeCompare(b),
  );
  return (
    <main>
      <div className="col">
        <Suspense>
          <Builder playerId={player.id} playerName={player.name} adventures={adventures} />
        </Suspense>
      </div>
    </main>
  );
}
