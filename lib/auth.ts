import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type Role = "player" | "gm";

const COOKIE = "mtfbwy_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours: entering a code gives access to every player for the session

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return s || "dev-only-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const list = (v: string | undefined) =>
  (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Returns the role a code grants, or null if it is not valid. */
export function roleForCode(code: string): Role | null {
  const c = code.trim();
  if (!c) return null;
  if (list(process.env.GM_CODE).some((g) => safeEqual(g, c))) return "gm";
  if (list(process.env.PLAYER_CODES).some((p) => safeEqual(p, c))) return "player";
  return null;
}

export async function setSession(role: Role) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${role}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Current role from the signed cookie, or null. The GM also counts as a player. */
export async function getRole(): Promise<Role | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [role, exp, sig] = raw.split(".");
  if (!role || !exp || !sig) return null;
  if (!safeEqual(sig, sign(`${role}.${exp}`))) return null;
  const now = Date.now() / 1000;
  if (Number(exp) < now) return null;
  // Refuse cookies issued under the old 30-day lifetime (expiry further out than 8 hours allows)
  if (Number(exp) > now + MAX_AGE + 60) return null;
  return role === "gm" || role === "player" ? role : null;
}
