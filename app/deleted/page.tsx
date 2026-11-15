import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/PageHeading";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DeletedPage({ searchParams }: { searchParams: Promise<{ name?: string; player?: string }> }) {
  if (!(await getRole())) redirect("/code");
  const { name, player } = await searchParams;
  const players = await getStore().players();
  const owner = players.find((p) => p.id === player);
  return (
    <main>
      <div className="col wide"><div className="builder-col">
        <PageHeading title="Character deleted">
          <p className="lede">{name ? `${name} has been deleted.` : "The character has been deleted."} The GM keeps a copy and can bring them back.</p>
        </PageHeading>
        <p className="section">
          <Link className="btn" href={owner ? `/p/${owner.id}` : "/"}>Back to all characters</Link>
        </p>
      </div></div>
    </main>
  );
}
