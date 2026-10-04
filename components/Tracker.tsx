"use client";

import { PageHeading } from "./PageHeading";
import { SlotGrid } from "./SlotGrid";
import { SyncBadge, usePolledCharacters } from "./usePolledCharacters";
import { TRACKS, type Character } from "@/lib/types";

export function Tracker({ initial }: { initial: Character }) {
  const { chars, patch, sync } = usePolledCharacters([initial], `/api/characters/${initial.id}`);
  const ch = chars[0] ?? initial;

  return (
    <>
      <PageHeading title={`Track ${ch.name}’s stats`}>
        <p className="lede">
          Use this space to track {ch.name}’s willpower, health and armour, with the character sheet as a helpful reference.
        </p>
      </PageHeading>

      {TRACKS.map((t) => {
        const max = ch[`${t.key}_max`];
        const used = ch[`${t.key}_used`];
        return (
          <section className="track" key={t.key}>
            <div className="track-head">
              <h2>{t.label}</h2>
              <span className="count" aria-hidden>{max - used} / {max} left</span>
            </div>
            <p className="sub">{t.blurb}</p>
            <SlotGrid
              penalties={t.key === "wp"}
              label={t.label}
              max={max}
              used={used}
              onChange={(n) => patch(ch.id, { [`${t.key}_used`]: n })}
            />
            {t.key === "wp" && (
              // Always rendered so screen readers announce the penalty as it changes; empty (no space) at 0-6 marked
              <p className="penalty" role="status">
                {used > 6 && (
                  <>
                    Subtract <strong>{(used - 6) * 2} from all action rolls</strong> using your dyad dice
                  </>
                )}
              </p>
            )}
          </section>
        );
      })}
      <SyncBadge sync={sync} />
    </>
  );
}
