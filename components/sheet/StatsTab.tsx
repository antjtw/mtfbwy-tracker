"use client";

import { type Sheet, type SheetResource } from "@/lib/hero/sheet";
import { TRAIT_NAMES, type ProficiencyStep } from "@/lib/hero/types";
import type { Play } from "./usePlay";
import type { RollRequest } from "@/components/roller/RollerDrawer";
import { RestButtons, UseBoxes } from "./AbilitiesTab";

const TRAIT_NAME_SAVE = (t: keyof typeof TRAIT_NAMES) => `${TRAIT_NAMES[t]} saving roll`;
const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
export const STEP_LABEL = ["Untrained", "Trained", "Proficient", "Expertise"] as const;

/** Untrained is an empty ring in the secondary colour, trained a half-filled circle, proficient a filled circle, expertise a diamond */
export function ProfMark({ step }: { step: ProficiencyStep }) {
  return (
    <svg className={`prof-mark step-${step}`} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {step === 3 ? (
        <path d="M10 1.5 18.5 10 10 18.5 1.5 10z" fill="currentColor" />
      ) : (
        <>
          <circle cx="10" cy="10" r="7" fill={step === 2 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" />
          {step === 1 && <path d="M10 3a7 7 0 0 0 0 14z" fill="currentColor" />}
        </>
      )}
    </svg>
  );
}

/** A small hexagon with an A or a D: Advantage in the design system's green, Disadvantage in its red. Names where it comes from. */
export function AdvMark({ kind, sources }: { kind: "A" | "D"; sources: string[] }) {
  const word = kind === "A" ? "Advantage" : "Disadvantage";
  const text = `${word} from ${sources.join(", ")}`;
  return (
    <span className={`adv-mark ${kind === "A" ? "adv" : "dis"}`} title={text}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
        <path d="M11 1.5 19.2 6.25v9.5L11 20.5l-8.2-4.75v-9.5z" fill="currentColor" />
        <text x="11" y="15" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--page-bg)">{kind}</text>
      </svg>
      <span className="sr-only">{text}</span>
    </span>
  );
}

function Marks({ mods }: { mods?: { advantage: string[]; disadvantage: string[] } }) {
  if (!mods || (!mods.advantage.length && !mods.disadvantage.length)) return null;
  return (
    <span className="adv-marks">
      {mods.advantage.length > 0 && <AdvMark kind="A" sources={mods.advantage} />}
      {mods.disadvantage.length > 0 && <AdvMark kind="D" sources={mods.disadvantage} />}
    </span>
  );
}

/** What a check hands the roller: its name, its modifier and where Advantage or Disadvantage may come from */
export type RollAsk = Omit<RollRequest, "id">;

function Stat({ label, value, note, onRoll }: { label: string; value: string | number; note?: string; onRoll?: () => void }) {
  return (
    <div className="stat-tile" style={onRoll ? { position: "relative" } : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <span className="stat-note">{note}</span>}
      {onRoll && <button type="button" className="roll-tile-btn" onClick={onRoll} aria-label={`Roll ${label}, ${value}`} />}
    </div>
  );
}

export function StatsTab({ sheet, play, characterId, onRoll }: { sheet: Sheet; play: Play; characterId: string; onRoll?: (ask: RollAsk) => void }) {
  const spendable = sheet.resources.filter((r) => r.spendable);
  const dice = sheet.resources.filter((r) => !r.spendable);
  /** A row that opens the roller with this check's modifier filled in */
  const rollRow = (label: string, modifier: number, mods: { advantage: string[]; disadvantage: string[] } | undefined, children: React.ReactNode) => {
    if (!onRoll) return children;
    const notes = [mods?.advantage.length ? `advantage may apply from ${mods.advantage.join(", ")}` : "", mods?.disadvantage.length ? `disadvantage may apply from ${mods.disadvantage.join(", ")}` : ""].filter(Boolean).join("; ");
    return (
      <button type="button" className="roll-btn" aria-label={`Roll ${label}, ${sign(modifier)}${notes ? `; ${notes}` : ""}`} onClick={() => onRoll({ label, modifier, advantage: mods?.advantage, disadvantage: mods?.disadvantage })}>
        {children}
      </button>
    );
  };
  return (
    <div className="sheet">
      {!sheet.complete && (
        <div className="note unfinished" role="note">
          This Hero isn’t finished, so some numbers may be missing. <a className="standalone" href={`/c/${characterId}/edit`}>Finish {sheet.name || "your Hero"}</a>
        </div>
      )}

      <section className="track" aria-labelledby="stats-traits">
        <h2 id="stats-traits">Traits</h2>
        {onRoll && <p className="muted roll-tip">Select a trait, saving roll or skill to open the dice roller with its modifier ready.</p>}
        <dl className="stat-row traits">
          {sheet.traits.map((t) => (
            <Stat key={t.trait} label={TRAIT_NAMES[t.trait]} value={sign(t.modifier)} note={t.trait} onRoll={onRoll ? () => onRoll({ label: TRAIT_NAMES[t.trait], modifier: t.modifier }) : undefined} />
          ))}
        </dl>
      </section>

      <section className="track" aria-labelledby="stats-movement">
        <h2 id="stats-movement">Movement</h2>
        <dl className="stat-row three">
          <Stat label="Evasion" value={sheet.evasion} />
          <Stat label="Speed" value={`${sheet.speed.metres}m`} note={sheet.speed.note} />
          <Stat label="Grid" value={sheet.speed.squares} note="1.5m squares" />
        </dl>
      </section>

      <section className="track" aria-labelledby="stats-bonuses">
        <h2 id="stats-bonuses">Bonuses</h2>
        <ul className="row-list">
          <li><span>Level</span><b className="mod-chip">{sheet.level}</b></li>
          <li><span>Proficiency bonus</span><b className="mod-chip">{sign(sheet.proficiencyBonus)}</b></li>
          {dice.map((r) => (
            <li key={r.key}>
              {onRoll ? (
                <button type="button" className="roll-btn roll-die" aria-label={`Roll ${r.name}, ${r.count}d4`} onClick={() => onRoll({ label: r.name, modifier: 0, dice: { d4: r.count } })}>
                  <span>{r.name}</span><b className="mod-chip">{r.count}d4</b>
                </button>
              ) : (
                <><span>{r.name}</span><b className="mod-chip">{r.count}d4</b></>
              )}
            </li>
          ))}
          {sheet.casting.map((c) => <li key={c.kind}><span>{c.kind}</span><b className="mod-chip">{sign(c.modifier)}</b></li>)}
        </ul>
      </section>

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
        <ul className="prof-list compact">
          {sheet.saves.map((s) => (
            <li key={s.trait}>
              {rollRow(`${TRAIT_NAME_SAVE(s.trait)}`, s.modifier, sheet.rollMods.saves[s.trait], (
                <>
                  <ProfMark step={s.proficient ? 2 : 0} />
                  <span className="prof-trait" aria-hidden="true">{s.trait}</span>
                  <span className="sr-only">{TRAIT_NAMES[s.trait]}, {s.proficient ? "proficient" : "not proficient"}</span>
                  <Marks mods={sheet.rollMods.saves[s.trait]} />
                  <b className="mod-chip">{sign(s.modifier)}</b>
                </>
              ))}
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
        <ul className="prof-list">
          {[...sheet.skills].sort((a, b) => a.skill.localeCompare(b.skill)).map((s) => (
            <li key={s.skill}>
              {rollRow(s.skill, s.modifier, sheet.rollMods.skills[s.skill], (
                <>
                  <ProfMark step={s.step} />
                  <span className="prof-trait" aria-hidden="true">{s.trait}</span>
                  <span className="prof-name">{s.skill}<span className="sr-only">, {TRAIT_NAMES[s.trait]}, {STEP_LABEL[s.step].toLowerCase()}</span></span>
                  <Marks mods={sheet.rollMods.skills[s.skill]} />
                  <b className="mod-chip">{sign(s.modifier)}</b>
                </>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section className="track" aria-labelledby="stats-passives">
        <h2 id="stats-passives">Passive skills</h2>
        <ul className="prof-list">
          {sheet.passives.map((p) => (
            <li key={p.name}>
              <span className="prof-trait" aria-hidden="true">{p.trait}</span>
              <span className="prof-name">{p.name}<span className="sr-only">, passive</span></span>
              <b className="mod-chip">{p.value}</b>
            </li>
          ))}
        </ul>
      </section>
      {play.error && <p className="err-text" role="alert">{play.error}</p>}
    </div>
  );
}
