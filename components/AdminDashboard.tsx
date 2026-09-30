"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlotGrid } from "./SlotGrid";
import { SyncBadge, usePolledCharacters } from "./usePolledCharacters";
import { CURRENT_ADVENTURES, MAX_SLOTS, TRACKS, type Character, type Player } from "@/lib/types";

const ALL = "All";
const OTHER = "Other";

export function AdminDashboard({ initial, players }: { initial: Character[]; players: Player[] }) {
  const { chars, patch, sync } = usePolledCharacters(initial, "/api/characters");
  const [tab, setTab] = useState(ALL);

  // A character with several adventures is listed under each of them (same record, same slots)
  const tagsOf = (c: Character) => (c.adventures.length ? c.adventures : [OTHER]);

  const adventures = useMemo(() => {
    const names = new Set(chars.flatMap(tagsOf));
    // Current adventures first, then the rest alphabetically
    return [...names].sort(
      (a, b) =>
        Number(CURRENT_ADVENTURES.includes(b)) - Number(CURRENT_ADVENTURES.includes(a)) || a.localeCompare(b),
    );
  }, [chars]);

  const visible = chars.filter((c) => tab === ALL || tagsOf(c).includes(tab));
  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <p className="eyebrow">GM access</p>
      <h1>Admin view</h1>
      <p className="lede">See where everyone is at, and set how many slots each character has.</p>

      <div className="tabs" role="group" aria-label="Filter by adventure">
        {[ALL, ...adventures].map((c) => (
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
            {c.adventures.length > 0 && (
              <span className="tags" style={{ gridColumn: "auto", flexBasis: "100%", justifyContent: "flex-start" }}>
                {c.adventures.map((a) => (
                  <span key={a} className={`tag ${CURRENT_ADVENTURES.includes(a) ? "gold" : ""}`}>{a}</span>
                ))}
              </span>
            )}
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
      {visible.length === 0 && <p className="muted">No characters in this adventure yet.</p>}
      <SyncBadge sync={sync} />
    </>
  );
}
