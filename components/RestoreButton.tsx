"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RestoreButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function restore() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/deleted/${id}`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (res.ok) {
        router.refresh();
        return;
      }
      setMsg(body.error === "exists" ? `A character with this id already exists, so ${name} can’t be put back.` : `Couldn’t restore ${name}. ${body.message ?? ""}`);
    } catch {
      setMsg("Couldn’t reach the server.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" className="btn" disabled={busy} onClick={restore} aria-label={`Restore ${name}`}>{busy ? "Restoring…" : "Restore"}</button>
      {msg && <p className="err-text" role="alert">{msg}</p>}
    </>
  );
}
