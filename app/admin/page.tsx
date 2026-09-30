import Link from "next/link";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if ((await getRole()) !== "gm") redirect(`/code?admin=1&next=${encodeURIComponent("/admin")}`);
  const store = getStore();
  const [chars, players] = await Promise.all([store.characters(), store.players()]);
  return (
    <main>
      <div className="col wide">
        <AdminDashboard initial={chars} players={players} />
        <p className="section"><Link href="/">Back to players</Link></p>
      </div>
    </main>
  );
}
