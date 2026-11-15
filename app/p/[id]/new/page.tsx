import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Builder } from "@/components/builder/Builder";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/p/${id}/new`)}`);
  const player = (await getStore().players()).find((p) => p.id === id);
  if (!player) notFound();
  return (
    <main>
      <div className="col">
        <Suspense>
          <Builder playerId={player.id} playerName={player.name} />
        </Suspense>
      </div>
    </main>
  );
}
