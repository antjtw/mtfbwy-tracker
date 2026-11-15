import Link from "next/link";
import { redirect } from "next/navigation";
import { CardFace } from "@/components/cards/CardFace";
import { PageHeading } from "@/components/PageHeading";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ source?: string; tier?: string; q?: string }> };

export default async function CardsPage({ searchParams }: Props) {
  const { source = "", tier = "", q = "" } = await searchParams;
  if (!(await getRole())) redirect(`/code?next=${encodeURIComponent("/cards")}`);
  const all = await getStore().cards();

  const sources = [...new Set(all.map((c) => (c.sourceType === "tradition" ? c.sourceName : c.path || c.sourceName)))];
  const text = q.trim().toLowerCase();
  const shown = all.filter(
    (c) =>
      (!source || (c.sourceType === "tradition" ? c.sourceName : c.path || c.sourceName) === source) &&
      (tier === "" || c.tier === Number(tier)) &&
      (!text || `${c.name} ${c.content}`.toLowerCase().includes(text)),
  );

  return (
    <main>
      <div className="col">
        <PageHeading title="Cards">
          <p className="lede">Every card from the Abilities sheet.</p>
        </PageHeading>

        <form method="get" className="card-filters">
          <div className="field">
            <label htmlFor="source">Source</label>
            <select id="source" name="source" defaultValue={source}>
              <option value="">All</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tier">Tier</label>
            <select id="tier" name="tier" defaultValue={tier}>
              <option value="">All</option>
              {[0, 1, 2, 3].map((t) => <option key={t} value={t}>Tier {t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={q} />
          </div>
          <button type="submit" className="btn">Filter</button>
        </form>

        <p className="note" role="status">{shown.length} of {all.length} cards</p>
        <div className="card-grid">
          {shown.map((c) => <CardFace key={c.id} card={c} href={`/cards/${encodeURIComponent(c.id)}`} />)}
        </div>
        {shown.length === 0 && <p className="muted">No cards match.</p>}
        <p className="section"><Link className="standalone" href="/">Back to players</Link></p>
      </div>
    </main>
  );
}
