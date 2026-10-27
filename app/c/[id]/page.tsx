import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Tracker } from "@/components/Tracker";

export const dynamic = "force-dynamic";

export default async function TrackerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/c/${id}${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`)}`);
  const store = getStore();
  const [ch, despair, players] = await Promise.all([store.character(id), store.despair(), store.players()]);
  if (!ch || !ch.tracked) notFound();

  return (
    <main>
      <div className="col tracker">
        <Tracker initialTab={tab === "stats" || tab === "inventory" ? tab : "slots"} initial={ch} despair={despair} playerName={players.find((p) => p.id === ch.player_id)?.name ?? ""} />
        <p className="section"><Link className="standalone" href={`/p/${ch.player_id}`}>Back to characters</Link></p>
      </div>
    </main>
  );
}
