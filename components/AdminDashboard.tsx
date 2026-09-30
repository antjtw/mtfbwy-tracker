"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlotGrid } from "./SlotGrid";
import { SyncBadge, usePolledCharacters } from "./usePolledCharacters";
import { MAX_SLOTS, TRACKS, type Character, type Player } from "@/lib/types";

const ALL = "All";

export function AdminDashboard({ initial, players }: { initial: Character[]; players: Player[] }) {
  const { chars, patch, sync } = usePolledCharacters(initial, "/api/characters");
  const [tab, setTab] = useState(ALL);

  const campaigns = useMemo(() => {
    // Current campaigns first, then the rest alphabetically
    const seen = new Map<string, boolean>();
    for (const c of chars) seen.set(c.campaign, (seen.get(c.campaign) ?? false) || c.current);
    return [...seen.entries()]
      .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [chars]);

  const visible = chars.filter((c) => tab === ALL || c.campaign === tab);
  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <p className="eyebrow">GM access</p>
      <h1>Admin view</h1>
      <p className="lede">See where everyone is at, and set how many slots each character has.</p>

      <div className="tabs" role="group" aria-label="Filter by campaign">
        {[ALL, ...campaigns].map((c) => (
          <button key={c} className="tab" aria-pressed={tab === c} onClick={() => setTab(c)}>{c}</button>
        ))}
      </div>

      {visible.map((c) => (
        <article className="admin-card" key={c.id}>
          <header>
            <h2>{c.name}</h2>
            <span className="muted">
              {playerName(c.player_id)} · <Link href={`/c/${c.id}`}>Open tracker</Link>
            </span>
          </header>
          <div className="admin-tracks">
            {TRACKS.map((t) => {
              const max = c[`${t.key}_max`];
              const used = c[`${t.key}_used`];
              const set = (n: number) => patch(c.id, { [`${t.key}_max`]: n });
              return (
                <div className="admin-track" key={t.key}>
                  <div className="label">{t.label.replace(" slots", "")}</div>
                  <div className="row">
                    <SlotGrid mini label={t.label} max={max} used={used} />
                    <div className="stepper">
                      <button aria-label={`Decrease ${t.label}`} disabled={max <= 0} onClick={() => set(max - 1)}>−</button>
                      <output>{max}</output>
                      <button aria-label={`Increase ${t.label}`} disabled={max >= MAX_SLOTS} onClick={() => set(max + 1)}>+</button>
                    </div>
                  </div>
                  <div className="nums">{used} of {max} used</div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
      {visible.length === 0 && <p className="muted">No characters in this campaign yet.</p>}
      <SyncBadge sync={sync} />
    </>
  );
}
