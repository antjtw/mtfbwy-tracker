"use client";

import { useId, useState } from "react";
import { choiceKey } from "@/lib/hero/engine";
import { ALL_SKILLS } from "@/lib/hero/steps";
import { type Choice, type Hero, type SkillName, TRAIT_NAMES, TRAITS } from "@/lib/hero/types";

export interface Option {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  reason?: string;
  /** A line of flavour shown under the name; where there isn't one, the summary of what it gives is shown instead */
  blurb?: string;
  /** What it gives, as short items shown as lozenges once the card is opened */
  more?: readonly string[];
  /** Named abilities with rules text; each opens in place when pressed */
  features?: readonly { name: string; text: string }[];
}

/** One-of-many as native radios: keyboard and screen reader behaviour comes for free */
export function RadioList({ legend, name, options, value, onChange, hint, filterable, grouped }: { legend: string; name: string; options: readonly Option[]; value: string | undefined; onChange: (id: string) => void; hint?: string; filterable?: boolean; grouped?: boolean }) {
  const hintId = useId();
  const filterId = useId();
  const [query, setQuery] = useState("");
  // Every word has to match somewhere in the name, summary or detail; the chosen option always stays in view
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = filterable && words.length
    ? options.filter((o) => o.id === value || words.every((w) => [o.label, o.hint, ...(o.more ?? [])].join(" ").toLowerCase().includes(w)))
    : options;
  return (
    <fieldset className="choice-set" aria-describedby={hint ? hintId : undefined}>
      <legend>{legend}</legend>
      {hint && <p className="choice-hint" id={hintId}>{hint}</p>}
      {filterable && (
        <div className="field choice-filter">
          <label htmlFor={filterId}>Filter {legend.toLowerCase()}</label>
          <input id={filterId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, trait or skill, e.g. STR or Stealth" autoComplete="off" />
          <p className="choice-hint" aria-live="polite">{words.length ? (shown.length ? `Showing ${shown.length} of ${options.length}` : "Nothing matches") : `${options.length} to choose from`}</p>
        </div>
      )}
      {grouped ? (
        // Alphabetical, under a letter heading each, so a long list can be scanned
        [...new Set(shown.map((o) => o.label[0].toUpperCase()))].map((letter) => (
          <div key={letter} className="choice-group">
            <h3 className="choice-letter">{letter}</h3>
            <div className="choice-list">{shown.filter((o) => o.label[0].toUpperCase() === letter).map((o) => <RadioCard key={o.id} o={o} name={name} value={value} onChange={onChange} />)}</div>
          </div>
        ))
      ) : (
        <div className="choice-list">{shown.map((o) => <RadioCard key={o.id} o={o} name={name} value={value} onChange={onChange} />)}</div>
      )}
    </fieldset>
  );
}

function RadioCard({ o, name, value, onChange }: { o: Option; name: string; value: string | undefined; onChange: (id: string) => void }) {
  const items = [...(o.blurb && o.hint ? [o.hint] : []), ...(o.more ?? [])];
  const features = o.features ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const detailId = useId();
  const shownFeature = features.find((f) => f.name === open);
  return (
    <div className={`choice-card ${o.disabled ? "disabled" : ""}`}>
      <label className="choice">
        <input type="radio" name={name} value={o.id} checked={value === o.id} disabled={o.disabled} onChange={() => onChange(o.id)} />
        <span className="choice-body">
          <span className="choice-label">{o.label}</span>
          {(o.blurb ?? o.hint) && <span className="choice-meta">{o.blurb ?? o.hint}</span>}
          {o.disabled && o.reason && <span className="choice-meta">{o.reason}</span>}
        </span>
        <Tick />
      </label>
      {(items.length > 0 || features.length > 0) && (
        <details className="choice-more" onToggle={(e) => !e.currentTarget.open && setOpen(null)}>
          <summary>What you get<span className="sr-only"> from {o.label}</span></summary>
          <ul className="chips" aria-label={`What ${o.label} gives`}>
            {items.map((m, i) => <li key={`i${i}`} className="chip">{m}</li>)}
            {features.map((f) => (
              <li key={f.name}>
                <button type="button" className="chip chip-button" aria-expanded={open === f.name} aria-controls={detailId} onClick={() => setOpen(open === f.name ? null : f.name)}>
                  {f.name}
                  <svg className="chip-caret" aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l5 5 5-5" /></svg>
                </button>
              </li>
            ))}
          </ul>
          <div id={detailId} aria-live="polite">
            {shownFeature && <p className="chip-detail"><strong>{shownFeature.name}</strong> {shownFeature.text}</p>}
          </div>
        </details>
      )}
    </div>
  );
}

/** Shows on the chosen card, so the choice isn't carried by colour alone */
function Tick() {
  return (
    <svg className="choice-tick" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

/** Pick exactly `n` from a list; once n are ticked the rest are unavailable until one is unticked */
export function CheckList({ legend, name, options, value, n, onChange }: { legend: string; name: string; options: readonly Option[]; value: string[]; n: number; onChange: (ids: string[]) => void }) {
  return (
    <fieldset className="choice-set">
      <legend>{legend}</legend>
      <p className="choice-hint" aria-live="polite">Chosen {value.length} of {n}</p>
      <div className="choice-list">
        {options.map((o) => {
          const on = value.includes(o.id);
          const full = value.length >= n && !on;
          return (
            <div key={o.id} className={`choice-card ${full ? "disabled" : ""}`}>
            <label className="choice">
              <input
                type="checkbox"
                name={name}
                value={o.id}
                checked={on}
                disabled={full}
                onChange={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
              />
              <span className="choice-body">
                <span className="choice-label">{o.label}</span>
                {o.hint && <span className="choice-meta">{o.hint}</span>}
              </span>
              <Tick />
            </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The decisions a source asks for, stored in Hero.choices */
export function ChoiceFields({ hero, setChoice, sourceKey, choices, skip }: { hero: Hero; setChoice: (key: string, v: string | string[]) => void; sourceKey: string; choices: readonly Choice[]; skip?: (c: Choice) => boolean }) {
  return (
    <>
      {choices.filter((c) => !skip?.(c)).map((c) => {
        const key = choiceKey(sourceKey, c.id);
        const v = hero.choices[key];
        if (c.kind === "text") {
          return (
            <div className="field" key={key}>
              <label htmlFor={key}>{c.label}</label>
              <input id={key} value={typeof v === "string" ? v : ""} onChange={(e) => setChoice(key, e.target.value)} />
            </div>
          );
        }
        if (c.kind === "skill") {
          const list: readonly SkillName[] = c.options ?? ALL_SKILLS;
          const opts = list.map((s) => ({ id: s, label: s }));
          return c.n === 1 ? (
            <RadioList key={key} legend={c.label} name={key} options={opts} value={typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined} onChange={(id) => setChoice(key, [id])} />
          ) : (
            <CheckList key={key} legend={c.label} name={key} options={opts} n={c.n} value={Array.isArray(v) ? v : []} onChange={(ids) => setChoice(key, ids)} />
          );
        }
        if (c.kind === "trait") {
          const opts = (c.options ?? TRAITS).map((t) => ({ id: t, label: `${TRAIT_NAMES[t]} (${t})` }));
          return <RadioList key={key} legend={c.label} name={key} options={opts} value={typeof v === "string" ? v : undefined} onChange={(id) => setChoice(key, id)} />;
        }
        return (
          <RadioList key={key} legend={c.label} name={key} options={c.options.map((o) => ({ id: o.id, label: o.label }))} value={typeof v === "string" ? v : undefined} onChange={(id) => setChoice(key, id)} />
        );
      })}
    </>
  );
}

/** The "You gain" block shown after a selection */
export function Gain({ title = "You gain", lines }: { title?: string; lines: readonly string[] }) {
  if (!lines.length) return null;
  return (
    <section className="gain" aria-label={title}>
      <h3>{title}</h3>
      <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </section>
  );
}
