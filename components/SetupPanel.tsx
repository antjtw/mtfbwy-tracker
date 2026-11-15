"use client";

import { useState } from "react";

type Result = { ok: boolean; text: string };

/** One-off database set-up the GM can run from the browser: loads cards, builds Heroes for existing characters */
export function SetupPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});

  async function run(action: "cards" | "heroes") {
    setBusy(action);
    try {
      const res = await fetch("/api/admin/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const text = res.ok
        ? action === "cards"
          ? `Done. ${body.cards} cards are in the database.`
          : `Done. ${body.created} new Heroes built, ${body.alreadyHad} already had one.`
        : `Failed: ${body.message ?? body.error}${body.code ? ` (${body.code})` : ""}${body.hint ? `. ${body.hint}` : ""}`;
      setResults((r) => ({ ...r, [action]: { ok: res.ok, text } }));
    } catch {
      setResults((r) => ({ ...r, [action]: { ok: false, text: "Couldn’t reach the server." } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="setup">
      <section className="track">
        <h2>Cards</h2>
        <p className="sub">Loads all 208 cards from the Abilities sheet into the database. Safe to run again to refresh them.</p>
        <p><button className="btn" disabled={busy !== null} onClick={() => run("cards")}>{busy === "cards" ? "Loading…" : "Load cards"}</button></p>
        {results.cards && <p className={results.cards.ok ? "note" : "err-text"} role="status">{results.cards.text}</p>}
      </section>
      <section className="track">
        <h2>Heroes for existing characters</h2>
        <p className="sub">Builds a half-built Hero for every character that doesn’t have one yet. Heroes that exist are never changed.</p>
        <p><button className="btn" disabled={busy !== null} onClick={() => run("heroes")}>{busy === "heroes" ? "Building…" : "Build Heroes"}</button></p>
        {results.heroes && <p className={results.heroes.ok ? "note" : "err-text"} role="status">{results.heroes.text}</p>}
      </section>
    </div>
  );
}
