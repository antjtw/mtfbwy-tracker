import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if ((await getRole()) !== "gm") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json((await getStore().characters()).filter((c) => c.tracked));
}
