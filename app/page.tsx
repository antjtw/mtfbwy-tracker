import Link from "next/link";
import { PageHeading } from "@/components/PageHeading";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { Character, Player, PlayerStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS: Record<PlayerStatus, { label: string; gold: boolean }> = {
  active: { label: "Active", gold: true },
  partial: { label: "Partially active", gold: false },
  inactive: { label: "Inactive", gold: false },
};

function PlayerList({ players, chars, signedIn }: { players: Player[]; chars: Character[]; signedIn: boolean }) {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  return (
    <ul className="list">
      {sorted.map((p) => {
        const names = chars.filter((c) => c.player_id === p.id && c.is_main).map((c) => c.name);
        const shown = names.slice(0, 4);
        const more = names.length > shown.length;
        return (
          <li key={p.id}>
            <Link href={signedIn ? `/p/${p.id}` : `/code?next=${encodeURIComponent(`/p/${p.id}`)}`} className="name">
              {p.name}
            </Link>
            <span className={`tag ${STATUS[p.status].gold ? "gold" : ""}`}>{STATUS[p.status].label}</span>
            <span className="meta">{shown.join(", ")}{more ? " and more" : ""}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function Home() {
  const store = getStore();
  const [players, chars, role] = await Promise.all([store.players(), store.characters(), getRole()]);
  return (
    <main>
      <div className="col">
        <PageHeading title="The Nexuverse">
          <p className="lede">A multi-campaign story, spanning 200 years in a galaxy far, far away….</p>
        </PageHeading>

        <section className="section">
          <h2>Main players</h2>
          <PlayerList players={players.filter((p) => !p.is_guest)} chars={chars} signedIn={!!role} />
        </section>
        <section className="section">
          <h2>Guest players</h2>
          <PlayerList players={players.filter((p) => p.is_guest)} chars={chars} signedIn={!!role} />
        </section>
        <p className="section">
          <Link className="standalone" href={role === "gm" ? "/admin" : `/code?admin=1&next=${encodeURIComponent("/admin")}`}>Games Master dashboard</Link>
        </p>
      </div>
    </main>
  );
}
