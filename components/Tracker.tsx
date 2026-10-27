"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { DespairChip, usePolledDespair } from "./Despair";
import { PageHeading } from "./PageHeading";
import { SlotGrid } from "./SlotGrid";
import { SyncBadge, usePolledCharacters } from "./usePolledCharacters";
import { buildParts } from "@/lib/build";
import { TRACKS, despairPool, type Character } from "@/lib/types";

const TABS = [
  { key: "slots", label: "Slots" },
  { key: "stats", label: "Stats and abilities" },
  { key: "inventory", label: "Inventory" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function Tracker({
  initial,
  despair,
  playerName,
  initialTab = "slots",
}: {
  initial: Character;
  despair: Record<string, number>;
  playerName: string;
  initialTab?: TabKey;
}) {
  const { chars, patch, sync } = usePolledCharacters([initial], `/api/characters/${initial.id}`);
  const ch = chars[0] ?? initial;
  const pool = despairPool(ch);
  const { values } = usePolledDespair(despair);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const id = useId();

  // Keep the chosen tab in the address so a refresh or shared link lands on it
  const choose = (key: TabKey) => {
    setTab(key);
    try {
      const url = new URL(window.location.href);
      if (key === "slots") url.searchParams.delete("tab");
      else url.searchParams.set("tab", key);
      window.history.replaceState(null, "", url);
    } catch {
      // Address bar not available: the tab still changes
    }
  };

  // Arrow keys, Home and End move between tabs (one tab stop for the whole list)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.key === tab);
    const next =
      e.key === "ArrowRight" ? (i + 1) % TABS.length
      : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? TABS.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    choose(TABS[next].key);
    const el = document.getElementById(`${id}-tab-${TABS[next].key}`);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <>
      <PageHeading title={ch.name} eyebrow={playerName} compact>
        <CharacterBuild ch={ch} />
      </PageHeading>

      <div className="tabs-row">
        <div className="tab-bar tab-bar-hero" role="tablist" aria-label={`${ch.name}’s sheet`} onKeyDown={onKeyDown}>
          {TABS.map((t) => (
            <button
              key={t.key}
              id={`${id}-tab-${t.key}`}
              className="tab-item"
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`${id}-panel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => choose(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <DespairChip value={values[pool] ?? 0} adventure={pool} />
      </div>

      <div id={`${id}-panel-slots`} role="tabpanel" aria-labelledby={`${id}-tab-slots`} hidden={tab !== "slots"}>
        <ConditionNotice ch={ch} />

        {TRACKS.map((t) => {
          const max = ch[`${t.key}_max`];
          const used = ch[`${t.key}_used`];
          return (
            <section className="track" key={t.key}>
              <div className="track-head">
                <h2>{t.heading}</h2>
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
      </div>

      {TABS.slice(1).map((t) => (
        <div key={t.key} id={`${id}-panel-${t.key}`} role="tabpanel" aria-labelledby={`${id}-tab-${t.key}`} hidden={tab !== t.key}>
          {/* Placeholder until the sheet is built: the animation, or its still frame for people who reduce motion */}
          <picture>
            <source media="(prefers-reduced-motion: reduce)" srcSet="/placeholders/tab-placeholder.jpg" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="tab-placeholder"
              src="/placeholders/tab-placeholder.gif"
              width={500}
              height={281}
              loading="lazy"
              alt="Placeholder: Anakin Skywalker standing in drifting smoke"
            />
          </picture>
        </div>
      ))}
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
