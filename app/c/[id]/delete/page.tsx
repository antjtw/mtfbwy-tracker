import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteForm } from "@/components/DeleteForm";
import { PageHeading } from "@/components/PageHeading";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DeleteCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/c/${id}/delete`)}`);
  const character = await getStore().character(id);
  if (!character) notFound();
  return (
    <main>
      <div className="col wide"><div className="builder-col">
        <PageHeading title={`Delete ${character.name}?`}>
          <p className="lede">This can’t be undone from here. Only the GM can bring a character back.</p>
        </PageHeading>
        <DeleteForm id={character.id} name={character.name} playerId={character.player_id} />
        <p className="section"><Link className="standalone" href={`/c/${id}`}>Back to the tracker</Link></p>
      </div></div>
    </main>
  );
}
