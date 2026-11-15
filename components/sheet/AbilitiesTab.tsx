"use client";

import { BASIC_ACTIONS, KIND_LABEL, KIND_ORDER } from "@/lib/hero/abilityKind";
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
  const hasCasting = sheet.casting.length > 0;
  return (
    <div className="sheet">
      {sheet.abilities.some((a) => a.per) && (
        <section className="track">
          <h2>Rests</h2>
          <p className="sub">Clears the once-per abilities that come back after a rest.</p>
          <RestButtons play={play} />
        </section>
      )}
      {KIND_ORDER.map((kind) => {
        const mine = sheet.abilities.filter((a) => a.kind === kind);
        const chips = kind === "move" && hasCasting ? ["Attack", "Cast a power", ...BASIC_ACTIONS.move.slice(1)] : [...BASIC_ACTIONS[kind]];
        if (mine.length === 0 && chips.length === 0) return null;
        return (
          <section className="track" key={kind} aria-labelledby={`abil-${kind}`}>
            <h2 id={`abil-${kind}`}>{KIND_LABEL[kind]}</h2>
            {chips.length > 0 && (
              <ul className="chips basic-chips" aria-label={`${KIND_LABEL[kind]} everyone has`}>
                {chips.map((c) => <li key={c} className="chip">{c}</li>)}
              </ul>
            )}
            <ul className="ability-list">
              {mine.map((a) => {
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
                    <p className="ability-source">{a.source}{a.cost ? ` · Willpower ${a.cost}` : ""}</p>
                    <p>{a.text}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {sheet.languages.trim() && (
        <section className="track" aria-labelledby="abil-languages">
          <h2 id="abil-languages">Languages spoken</h2>
          <p className="note">{sheet.languages}</p>
        </section>
      )}
      {sheet.abilities.length === 0 && <p className="note">No abilities yet. They appear once the Hero has a species, origin, career and path.</p>}
      <p className="note">Cards come next.</p>
      {play.error && <p className="err-text" role="alert">{play.error}</p>}
    </div>
  );
}
