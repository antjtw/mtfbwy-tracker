"use client";

import { useMemo, useState } from "react";
import { PageHeading } from "./PageHeading";
import { SlotGrid } from "./SlotGrid";
import { SyncBadge, usePolledCharacters } from "./usePolledCharacters";
import { CURRENT_ADVENTURES, MAX_SLOTS, TRACKS, type Character, type Player, type TrackKey } from "@/lib/types";

const ALL = "All";
const OTHER = "Other";

/** The GM dashboard lists willpower first (Figma "GM dashboard") */
const GM_ORDER: TrackKey[] = ["wp", "hp", "ar"];
const GM_TRACKS = GM_ORDER.map((k) => TRACKS.find((t) => t.key === k)!);

function MinusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "";

  // Cards are listed alphabetically by character name
  const visible = chars
    .filter((c) => tab === ALL || tagsOf(c).includes(tab))
    .sort((a, b) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }));

  return (
    <>
      <PageHeading title="Games Master dashboard">
        <p className="lede">Track every character at a glance, and unlock or lock their slots.</p>
      </PageHeading>

      <div className="tabs" role="group" aria-label="Filter by adventure">
        {[ALL, ...adventures].map((a) => (
          <button key={a} className="tab" aria-pressed={tab === a} onClick={() => setTab(a)}>{a}</button>
        ))}
      </div>

      <div className="gm-cards">
        {visible.map((c) => (
          <article className="gm-card" key={c.id} aria-labelledby={`gm-${c.id}`}>
            <div className="gm-head">
              <h2 className="gm-name" id={`gm-${c.id}`}>{c.name}</h2>
              <span className="gm-player">{playerName(c.player_id)}</span>
            </div>
            {GM_TRACKS.map((t) => {
              const max = c[`${t.key}_max`];
              const used = c[`${t.key}_used`];
              const set = (n: number) => patch(c.id, { [`${t.key}_max`]: n });
              return (
                <section className="gm-track" key={t.key}>
                  <h3 className="gm-label">{t.label.charAt(0) + t.label.slice(1).toLowerCase()}</h3>
                  <div className="gm-row">
                    <SlotGrid mini label={`${c.name} ${t.label.toLowerCase()}`} max={max} used={used} />
                    <div className="stepper">
                      <button
                        aria-label={`Lock one ${t.label.toLowerCase().replace(" slots", "")} slot for ${c.name}`}
                        disabled={max <= 0}
                        onClick={() => set(max - 1)}
                      >
                        <MinusIcon />
                      </button>
                      <output aria-live="polite" aria-label={`${max} ${t.label.toLowerCase()} unlocked`}>{max}</output>
                      <button
                        aria-label={`Unlock one ${t.label.toLowerCase().replace(" slots", "")} slot for ${c.name}`}
                        disabled={max >= MAX_SLOTS}
                        onClick={() => set(max + 1)}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}
          </article>
        ))}
      </div>
      {visible.length === 0 && <p className="muted">No characters in this adventure yet.</p>}
      <SyncBadge sync={sync} />
    </>
  );
}
