"use client";

import { useRef } from "react";
import { DespairBar, usePolledDespair } from "./Despair";
import { PageHeading } from "./PageHeading";
import { SlotGrid } from "./SlotGrid";
import { SyncBadge, usePolledCharacters } from "./usePolledCharacters";
import { buildParts } from "@/lib/build";
import { TRACKS, despairPool, type Character } from "@/lib/types";

export function Tracker({ initial, despair, playerName }: { initial: Character; despair: Record<string, number>; playerName: string }) {
  const { chars, patch, sync } = usePolledCharacters([initial], `/api/characters/${initial.id}`);
  const ch = chars[0] ?? initial;
  const pool = despairPool(ch);
  const { values } = usePolledDespair(despair);

  return (
    <>
      <PageHeading title={ch.name} eyebrow={playerName} compact>
        <CharacterBuild ch={ch} />
      </PageHeading>

      <DespairBar value={values[pool] ?? 0} adventure={pool} />

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

/**
 * Species, origin, Path (Archetype level) and career as one subdued line under the name, with gold
 * bullets between (Figma "Stat tracker"). Parts that aren't recorded yet are left out. The bullets
 * are drawn by CSS, so a screen reader hears a list with a spoken label for each part instead.
 */
function CharacterBuild({ ch }: { ch: Character }) {
  const parts = buildParts(ch);
  if (!parts.length) return null;
  return (
    <ul className="build" aria-label="Character build">
      {parts.map((p) => (
        <li key={p.key}>
          <span className="sr-only">{p.label}: </span>
          {p.text}
        </li>
      ))}
    </ul>
  );
}

const CONDITIONS = {
  unconscious: { title: "You’re unconscious", body: "All Willpower slots are marked, and you gain the unconscious condition." },
  dying: { title: "You’re dying", body: "All Hit Point slots are marked, and you gain the dying condition." },
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
