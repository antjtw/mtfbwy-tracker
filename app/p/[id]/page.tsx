import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { Character } from "@/lib/types";

export const dynamic = "force-dynamic";

function CharList({ chars }: { chars: Character[] }) {
  return (
    <ul className="list">
      {chars.map((c) => (
        <li key={c.id}>
          <Link href={`/c/${c.id}`} className="name">{c.name}</Link>
          <span className={`tag ${c.current ? "gold" : ""}`}>{c.campaign}</span>
          {c.description && <span className="meta">{c.description}</span>}
          {c.era && <span className="meta">{c.era}</span>}
        </li>
      ))}
    </ul>
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent(`/p/${id}`)}`);

  const store = getStore();
  const [players, chars] = await Promise.all([store.players(), store.characters()]);
  const player = players.find((p) => p.id === id);
  if (!player) notFound();

  const mine = chars.filter((c) => c.player_id === id);
  const first = player.name.split(" ")[0];
  const main = mine.filter((c) => c.is_main);
  const side = mine.filter((c) => !c.is_main);

  return (
    <main>
      <div className="col">
        <p className="eyebrow">Select a character</p>
        <h1>Select a character</h1>
        <p className="lede">You’ve taken your first step into a larger world.</p>
        {main.length > 0 && (
          <section className="section">
            <h2>{first}’s campaign characters</h2>
            <CharList chars={main} />
          </section>
        )}
        {side.length > 0 && (
          <section className="section">
            <h2>{first}’s side characters</h2>
            <CharList chars={side} />
          </section>
        )}
        <p className="section"><Link href="/">Back to players</Link></p>
      </div>
    </main>
  );
}
