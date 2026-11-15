"use client";

import { useId } from "react";
import { choiceKey } from "@/lib/hero/engine";
import { ALL_SKILLS } from "@/lib/hero/steps";
import { type Choice, type Hero, type SkillName, TRAIT_NAMES, TRAITS } from "@/lib/hero/types";

export interface Option {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  reason?: string;
  /** Fuller detail, opened in place under the card */
  more?: readonly string[];
}

/** One-of-many as native radios: keyboard and screen reader behaviour comes for free */
export function RadioList({ legend, name, options, value, onChange, hint }: { legend: string; name: string; options: readonly Option[]; value: string | undefined; onChange: (id: string) => void; hint?: string }) {
  const hintId = useId();
  return (
    <fieldset className="choice-set" aria-describedby={hint ? hintId : undefined}>
      <legend>{legend}</legend>
      {hint && <p className="choice-hint" id={hintId}>{hint}</p>}
      <div className="choice-list">
        {options.map((o) => (
          <div key={o.id} className={`choice-card ${o.disabled ? "disabled" : ""}`}>
            <label className="choice">
              <input type="radio" name={name} value={o.id} checked={value === o.id} disabled={o.disabled} onChange={() => onChange(o.id)} />
              <span className="choice-body">
                <span className="choice-label">{o.label}</span>
                {o.hint && <span className="choice-meta">{o.hint}</span>}
                {o.disabled && o.reason && <span className="choice-meta">{o.reason}</span>}
              </span>
            </label>
            {o.more && o.more.length > 0 && (
              <details className="choice-more">
                <summary>More info<span className="sr-only"> about {o.label}</span></summary>
                <ul>{o.more.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </fieldset>
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
