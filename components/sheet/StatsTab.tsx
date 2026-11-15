"use client";

import { type Sheet, type SheetResource } from "@/lib/hero/sheet";
import { TRAIT_NAMES, TRAITS, type ProficiencyStep, type Trait } from "@/lib/hero/types";
import type { Play } from "./usePlay";
import { RestButtons, UseBoxes } from "./AbilitiesTab";

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
export const STEP_LABEL = ["Untrained", "Trained", "Proficient", "Expertise"] as const;

/** Untrained is an empty ring, trained half full, proficient full, expertise full with a second ring */
export function ProfMark({ step }: { step: ProficiencyStep }) {
  return (
    <svg className={`prof-mark step-${step}`} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
      {step === 1 && <path d="M10 3a7 7 0 0 0 0 14z" fill="currentColor" />}
      {step >= 2 && <circle cx="10" cy="10" r="7" fill="currentColor" />}
      {step === 3 && <circle cx="10" cy="10" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.25" />}
    </svg>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="stat-tile">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

export function StatsTab({ sheet, play, characterId }: { sheet: Sheet; play: Play; characterId: string }) {
  const byTrait = (t: Trait) => sheet.skills.filter((s) => s.trait === t);
  const spendable = sheet.resources.filter((r) => r.spendable);
  const dice = sheet.resources.filter((r) => !r.spendable);
  return (
    <div className="sheet">
      {!sheet.complete && (
        <div className="note unfinished" role="note">
          This Hero isn’t finished, so some numbers may be missing. <a className="standalone" href={`/c/${characterId}/edit`}>Finish {sheet.name || "your Hero"}</a>
        </div>
      )}

      <section className="track" aria-labelledby="stats-traits">
        <h2 id="stats-traits">Traits</h2>
        <dl className="stat-row traits">
          {sheet.traits.map((t) => (
            <Stat key={t.trait} label={TRAIT_NAMES[t.trait]} value={sign(t.modifier)} note={t.trait} />
          ))}
        </dl>
      </section>

      <section className="track" aria-labelledby="stats-numbers">
        <h2 id="stats-numbers">Key numbers</h2>
        <dl className="stat-row">
          <Stat label="Level" value={sheet.level} />
          <Stat label="Proficiency bonus" value={sign(sheet.proficiencyBonus)} />
          <Stat label="Evasion" value={sheet.evasion} />
          <Stat label="Speed" value={`${sheet.speed.metres}m`} note={sheet.speed.note} />
        </dl>
      </section>

      <section className="track" aria-labelledby="stats-passives">
        <h2 id="stats-passives">Passives</h2>
        <dl className="stat-row">
          {sheet.passives.map((p) => (
            <Stat key={p.name} label={`Passive ${p.name}`} value={p.value} />
          ))}
        </dl>
      </section>

      {(sheet.casting.length > 0 || dice.length > 0) && (
        <section className="track" aria-labelledby="stats-casting">
          <h2 id="stats-casting">Casting and dice</h2>
          <dl className="stat-row">
            {sheet.casting.map((c) => (
              <Stat key={c.kind} label={c.kind} value={sign(c.modifier)} />
            ))}
            {dice.map((r) => (
              <Stat key={r.key} label={r.name} value={`${r.count}d4`} />
            ))}
          </dl>
        </section>
      )}

      {spendable.length > 0 && (
        <section className="track" aria-labelledby="stats-uses">
          <h2 id="stats-uses">Uses</h2>
          {spendable.map((r: SheetResource) => (
            <div key={r.key} className="use-row">
              <p className="use-name">{r.name}{r.refresh ? <span className="muted"> · back after a {r.refresh === "short" ? "short" : "full"} rest</span> : null}{r.note ? <span className="muted"> · {r.note}</span> : null}</p>
              <UseBoxes label={r.name} count={r.count} used={play.used[r.key] ?? 0} onChange={(n) => play.set(r.key, n)} />
            </div>
          ))}
          <RestButtons play={play} />
        </section>
      )}

      <section className="track" aria-labelledby="stats-saves">
        <h2 id="stats-saves">Saving rolls</h2>
        <ul className="prof-list">
          {sheet.saves.map((s) => (
            <li key={s.trait}>
              <ProfMark step={s.proficient ? 2 : 0} />
              <span className="prof-name">{TRAIT_NAMES[s.trait]}<span className="sr-only">, {s.proficient ? "proficient" : "not proficient"}</span></span>
              <strong>{sign(s.modifier)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="track" aria-labelledby="stats-skills">
        <h2 id="stats-skills">Skills</h2>
        <ul className="prof-key" aria-label="What the marks mean">
          {STEP_LABEL.map((l, i) => (
            <li key={l}><ProfMark step={i as ProficiencyStep} />{l}</li>
          ))}
        </ul>
        {TRAITS.filter((t) => byTrait(t).length > 0).map((t) => (
          <div key={t} className="skill-group">
            <h3>{TRAIT_NAMES[t]} <span className="muted">({t})</span></h3>
            <ul className="prof-list">
              {byTrait(t).map((s) => (
                <li key={s.skill}>
                  <ProfMark step={s.step} />
                  <span className="prof-name">{s.skill}<span className="sr-only">, {STEP_LABEL[s.step].toLowerCase()}</span></span>
                  <strong>{sign(s.modifier)}</strong>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      {play.error && <p className="err-text" role="alert">{play.error}</p>}
    </div>
  );
}
