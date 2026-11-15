"use client";

import { useCallback, useState } from "react";

/** Which once-per abilities and uses are spent, kept with the Hero and saved as you tick them */
export function usePlay(characterId: string, initial: Record<string, number>) {
  const [used, setUsed] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (body: object, optimistic: (u: Record<string, number>) => Record<string, number>) => {
      let before: Record<string, number> = {};
      setUsed((u) => {
        before = u;
        return optimistic(u);
      });
      setError(null);
      try {
        const res = await fetch(`/api/heroes/${characterId}/play`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error("save failed");
        const data = (await res.json()) as { used: Record<string, number> };
        setUsed(data.used);
      } catch {
        setUsed(before);
        setError("Couldn’t save that. Check your connection and try again.");
      }
    },
    [characterId],
  );

  const set = useCallback(
    (key: string, value: number) =>
      send({ key, value }, (u) => {
        const n = { ...u };
        if (value <= 0) delete n[key];
        else n[key] = value;
        return n;
      }),
    [send],
  );
  const rest = useCallback((r: "short" | "full") => send({ rest: r }, (u) => u), [send]);
  return { used, set, rest, error };
}

export type Play = ReturnType<typeof usePlay>;
