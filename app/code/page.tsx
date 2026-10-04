import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { CodeForm } from "@/components/CodeForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string; admin?: string }> };

export default async function CodePage({ searchParams }: Props) {
  const { next: rawNext = "/", admin } = await searchParams;
  // Only allow same-site relative redirects
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  // Already signed in within the last 8 hours: skip the form (the GM dashboard still needs the GM code)
  const role = await getRole();
  if (role && (admin !== "1" || role === "gm")) redirect(next);
  return (
    <Suspense>
      <CodeForm />
    </Suspense>
  );
}
