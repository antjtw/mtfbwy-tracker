"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Character, CharacterPatch } from "@/lib/types";

export type SyncState = "synced" | "saving" | "offline";

/**
 * Keeps a character (or a map of all characters) in sync: optimistic local edits,
 * PATCH to the server, and polling so other devices' changes show up within a couple of seconds.
 */
export function usePolledCharacters(initial: Character[], url: string, intervalMs = 2000) {
  const [chars, setChars] = useState<Character[]>(initial);
  const [sync, setSync] = useState<SyncState>("synced");
  const inFlight = useRef(0);
  const lastEdit = useRef(0);

  const refresh = useCallback(async () => {
    // Don't let a poll that started before an edit overwrite it
    if (inFlight.current > 0 || Date.now() - lastEdit.current < 1500) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const next: Character[] = Array.isArray(data) ? data : [data];
      if (inFlight.current === 0 && Date.now() - lastEdit.current >= 1500) {
        setChars(next);
        setSync("synced");
      }
    } catch {
      setSync("offline");
    }
  }, [url]);

  useEffect(() => {
    const t = setInterval(refresh, intervalMs);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", refresh);
    };
  }, [refresh, intervalMs]);

  const patch = useCallback(
    async (id: string, p: CharacterPatch) => {
      let failed = false;
      lastEdit.current = Date.now();
      inFlight.current++;
      setSync("saving");
      setChars((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
      try {
        const res = await fetch(`/api/characters/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        if (!res.ok) throw new Error(String(res.status));
        const saved: Character = await res.json();
        setChars((cs) => cs.map((c) => (c.id === id ? saved : c)));
        setSync("synced");
      } catch {
        setSync("offline");
        failed = true;
      } finally {
        inFlight.current--;
        lastEdit.current = failed ? 0 : Date.now();
      }
      if (failed) await refresh(); // roll back to server truth
    },
    [refresh],
  );

  return { chars, patch, sync };
}

export function SyncBadge({ sync }: { sync: SyncState }) {
  const text = sync === "synced" ? "Synced" : sync === "saving" ? "Saving…" : "Offline, retrying";
  return <div className={`sync ${sync === "offline" ? "bad" : ""}`} role="status">{text}</div>;
}
