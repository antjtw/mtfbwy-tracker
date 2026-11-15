import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CardFace } from "@/components/cards/CardFace";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = decodeURIComponent(id);
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/cards/${id}`)}`);
  const card = (await getStore().cards()).find((c) => c.id === cardId);
  if (!card) notFound();
  return (
    <main>
      <div className="col">
        <CardFace card={card} headingLevel={1} />
        <p className="section"><Link className="standalone" href="/cards">Back to cards</Link></p>
      </div>
    </main>
  );
}
