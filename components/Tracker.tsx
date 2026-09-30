"use client";

import { SlotGrid } from "./SlotGrid";
import { SyncBadge, usePolledCharacters } from "./usePolledCharacters";
import { TRACKS, type Character } from "@/lib/types";

export function Tracker({ initial }: { initial: Character }) {
  const { chars, patch, sync } = usePolledCharacters([initial], `/api/characters/${initial.id}`);
  const ch = chars[0] ?? initial;

  return (
    <>
      <p className="eyebrow">Stat tracker</p>
      <h1>Track {ch.name}’s stats</h1>
      <p className="lede">
        Use this space to track {ch.name}’s health, armour and willpower, with the character sheet as a helpful reference.
      </p>

      {TRACKS.map((t) => {
        const max = ch[`${t.key}_max`];
        const used = ch[`${t.key}_used`];
        return (
          <section className="track" key={t.key}>
            <div className="track-head">
              <h2>{t.label}</h2>
              <span className="count" aria-hidden>{used} / {max}</span>
            </div>
            <p className="sub">{t.blurb}</p>
            <SlotGrid
              label={t.label}
              max={max}
              used={used}
              onChange={(n) => patch(ch.id, { [`${t.key}_used`]: n })}
            />
          </section>
        );
      })}
      <SyncBadge sync={sync} />
    </>
  );
}
