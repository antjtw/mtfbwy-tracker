import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Called once a day by Vercel Cron (see vercel.json). Reads from the database so the Supabase
 * free tier sees regular activity and doesn't pause the project after 7 idle days.
 * If CRON_SECRET is set in Vercel, only requests carrying it (as Vercel Cron does) are served.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const players = await getStore().players();
  return NextResponse.json({ ok: true, players: players.length, at: new Date().toISOString() });
}
