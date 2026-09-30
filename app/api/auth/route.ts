import { NextResponse } from "next/server";
import { clearSession, roleForCode, setSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const role = roleForCode(String(body.code ?? ""));
  // The admin view needs the GM code specifically
  if (!role || (body.admin && role !== "gm")) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }
  await setSession(role);
  return NextResponse.json({ role });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
