"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const WORD = "DELETE";

/** Type DELETE in capitals to remove a character. The record is kept for the GM, who can bring it back. */
export function DeleteForm({ id, name, playerId }: { id: string; name: string; playerId: string }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed === WORD;

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${id}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: typed }) });
      if (res.ok) {
        router.push(`/deleted?name=${encodeURIComponent(name)}&player=${encodeURIComponent(playerId)}`);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setError(body.error === "not_kept" ? `Nothing was deleted, because the record couldn’t be kept. ${body.message ?? ""}` : "Couldn’t delete the character. Nothing has changed.");
    } catch {
      setError("Couldn’t reach the server. Nothing has changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={remove} noValidate className="builder-form delete-form">
      <div className="delete-warning" role="note">
        <strong>This takes {name} off the player’s list and the tracker.</strong>
        <p>Their slots, build, level-ups and abilities all go. The GM keeps a full copy and can bring {name} back if this was a mistake.</p>
      </div>
      <div className="field">
        <label htmlFor="delete-confirm">Are you sure you want to delete {name}? Type <strong>{WORD}</strong> in capital letters to confirm.</label>
        <input id="delete-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-describedby="delete-hint" />
        <p className="choice-hint" id="delete-hint">{ready ? "That matches." : "Capital letters, exactly as shown."}</p>
      </div>
      {error && <p className="err-text" role="alert">{error}</p>}
      <div className="step-nav">
        <Link className="btn quiet" href={`/c/${id}/edit`}>Keep {name}</Link>
        <button type="submit" className="btn danger" disabled={!ready || busy}>{busy ? "Deleting…" : "Delete character"}</button>
      </div>
    </form>
  );
}
