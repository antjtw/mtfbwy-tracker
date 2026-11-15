import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/PageHeading";
import { SetupPanel } from "@/components/SetupPanel";
import { getRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await getRole()) !== "gm") redirect(`/code?admin=1&next=${encodeURIComponent("/admin/setup")}`);
  return (
    <main>
      <div className="col">
        <PageHeading title="Database set-up">
          <p className="lede">One-off jobs for the character builder.</p>
        </PageHeading>
        <SetupPanel />
        <p className="section"><Link className="standalone" href="/admin">Back to dashboard</Link></p>
      </div>
    </main>
  );
}
