import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/PageHeading";
import { RestoreButton } from "@/components/RestoreButton";
import { describeBuild } from "@/lib/build";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DeletedCharactersPage() {
  if ((await getRole()) !== "gm") redirect(`/code?admin=1&next=${encodeURIComponent("/admin/deleted")}`);
  const store = getStore();
  const [deleted, players] = await Promise.all([store.deletedCharacters(), store.players()]);
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <main>
      <div className="col gm">
        <PageHeading title="Deleted characters">
          <p className="lede">Nothing here is gone. Each one is kept in full, and you can restore it or download it as JSON.</p>
        </PageHeading>
        {deleted.length === 0 ? (
          <p className="note">No characters have been deleted.</p>
        ) : (
          <ul className="deleted-list">
            {deleted.map((d) => (
              <li key={d.id} className="track">
                <h2>{d.name}</h2>
                <p className="sub">
                  {players.find((p) => p.id === d.player_id)?.name ?? d.player_id} · deleted {when(d.deleted_at)}{d.deleted_by === "gm" ? " by the GM" : d.deleted_by ? " by a player" : ""}
                </p>
                <p className="note">{describeBuild({ species: d.character.species, origin: d.character.origin, career: d.character.career, paths: d.character.paths }) || "No build recorded"}</p>
                <p className="deleted-actions">
                  <RestoreButton id={d.id} name={d.name} />
                  <a className="standalone" href={`/api/admin/deleted/${d.id}`} download>Download JSON</a>
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="section"><Link className="standalone" href="/admin">Back to dashboard</Link></p>
      </div>
    </main>
  );
}
