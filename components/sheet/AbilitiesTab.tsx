"use client";

import type { Sheet } from "@/lib/hero/sheet";
import type { Play } from "./usePlay";

const PER_LABEL = { short: "once per short rest", full: "once per full rest", session: "once per session", encounter: "once per encounter", scene: "once per scene" } as const;

/** A row of native checkboxes: tick one to mark a use spent */
export function UseBoxes({ label, count, used, onChange }: { label: string; count: number; used: number; onChange: (used: number) => void }) {
  return (
    <div className="use-boxes" role="group" aria-label={`${label}: ${used} of ${count} used`}>
      {Array.from({ length: count }, (_, i) => (
        <input
          key={i}
          type="checkbox"
          className="use-box"
          checked={i < used}
          aria-label={`${label} use ${i + 1}`}
          onChange={() => onChange(i < used ? i : i + 1)}
        />
      ))}
    </div>
  );
}

export function RestButtons({ play }: { play: Play }) {
  return (
    <div className="rest-buttons">
      <button type="button" className="btn quiet" onClick={() => play.rest("short")}>Short rest</button>
      <button type="button" className="btn quiet" onClick={() => play.rest("full")}>Full rest</button>
    </div>
  );
}

export function AbilitiesTab({ sheet, play }: { sheet: Sheet; play: Play }) {
  const groups = [...new Set(sheet.abilities.map((a) => a.source))];
  return (
    <div className="sheet">
      {sheet.abilities.some((a) => a.per) && (
        <section className="track">
          <h2>Rests</h2>
          <p className="sub">Clears the once-per abilities that come back after a rest.</p>
          <RestButtons play={play} />
        </section>
      )}
      {groups.map((source) => (
        <section className="track" key={source} aria-label={source}>
          <h2>{source}</h2>
          <ul className="ability-list">
            {sheet.abilities.filter((a) => a.source === source).map((a) => {
              const k = `ability:${a.key}`;
              return (
                <li key={a.key} className="ability">
                  <div className="ability-head">
                    <h3>{a.name}</h3>
                    {a.per && (
                      <label className="ability-use">
                        <input type="checkbox" className="use-box" checked={!!play.used[k]} onChange={(e) => play.set(k, e.target.checked ? 1 : 0)} />
                        <span>Used <span className="muted">({PER_LABEL[a.per]})</span></span>
                      </label>
                    )}
                  </div>
                  <p>{a.text}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {sheet.abilities.length === 0 && <p className="note">No abilities yet. They appear once the Hero has a species, origin, career and path.</p>}
      <p className="note">Cards come next.</p>
      {play.error && <p className="err-text" role="alert">{play.error}</p>}
    </div>
  );
}
