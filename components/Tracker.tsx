"use client";

import { useRef } from "react";
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

      <ConditionNotice ch={ch} />

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
            {t.key === "wp" && <WillpowerPenalty used={used} />}
          </section>
        );
      })}
      <SyncBadge sync={sync} />
    </>
  );
}

/**
 * "Subtract N from all action rolls" once 7+ willpower slots are marked (N = 2 per slot past the sixth).
 * The visible line eases open/closed (and keeps its last value while closing); a separate
 * screen-reader-only status carries the live value so changes are announced.
 */
function WillpowerPenalty({ used }: { used: number }) {
  const penalty = used > 6 ? (used - 6) * 2 : 0;
  const shown = useRef(2);
  if (penalty) shown.current = penalty;
  return (
    <>
      <div className={`penalty-wrap ${penalty ? "open" : ""}`} aria-hidden="true">
        <p className="penalty">
          Subtract <strong>{shown.current} from all action rolls</strong> using your dyad dice
        </p>
      </div>
      <p className="sr-only" role="status">
        {penalty ? `Subtract ${penalty} from all action rolls using your dyad dice` : ""}
      </p>
    </>
  );
}

const CONDITIONS = {
  unconscious: { title: "You’re unconscious", body: "All Willpower slots are marked, and you gain the unconscious condition." },
  dying: { title: "You’re dying", body: "All hit point slots are marked, and you gain the dying condition." },
  dead: { title: "You’re dead", body: "Choose a death move as you become one with the Force." },
} as const;

type Condition = keyof typeof CONDITIONS;

/** One notification at a time: both tracks fully marked = dead, otherwise unconscious (willpower) or dying (hit points). */
function conditionOf(ch: Character): Condition | null {
  const wpOut = ch.wp_max > 0 && ch.wp_used >= ch.wp_max;
  const hpOut = ch.hp_max > 0 && ch.hp_used >= ch.hp_max;
  return wpOut && hpOut ? "dead" : wpOut ? "unconscious" : hpOut ? "dying" : null;
}

/**
 * Eases open/closed so the slots below glide rather than jump, and re-plays its entrance when the
 * condition changes (Figma: "the notification closes and reloads in"). The visible card keeps its
 * last condition while closing; a screen-reader-only alert carries the live state.
 */
function ConditionNotice({ ch }: { ch: Character }) {
  const condition = conditionOf(ch);
  const shown = useRef<Condition>("unconscious");
  if (condition) shown.current = condition;
  const c = CONDITIONS[shown.current];
  return (
    <>
      <div className={`notice-wrap ${condition ? "open" : ""}`} aria-hidden="true">
        <div className="notice-clip">
          <div className="notice" key={shown.current}>
            <strong>{c.title}</strong>
            <span>{c.body}</span>
          </div>
        </div>
      </div>
      <p className="sr-only" role="alert">
        {condition ? `${CONDITIONS[condition].title}. ${CONDITIONS[condition].body}` : ""}
      </p>
    </>
  );
}
