import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Tracker } from "@/components/Tracker";

export const dynamic = "force-dynamic";

export default async function TrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/c/${id}`)}`);
  const store = getStore();
  const [ch, despair] = await Promise.all([store.character(id), store.despair()]);
  if (!ch || !ch.tracked) notFound();

  return (
    <main>
      <div className="col tracker">
        <Tracker initial={ch} despair={despair} />
        <p className="section"><Link className="standalone" href={`/p/${ch.player_id}`}>Back to characters</Link></p>
      </div>
    </main>
  );
}
