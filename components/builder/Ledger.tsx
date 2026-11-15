import type { Derived, Trait } from "@/lib/hero/types";
import { TRAIT_NAMES, TRAITS } from "@/lib/hero/types";

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/**
 * "Your Hero so far": every value with where it came from (R-TR-4). Open by default so the player can
 * always answer "why is my Strength +3?".
 */
export function Ledger({ d }: { d: Derived }) {
  const row = (t: Trait) => d.traitLedger[t].filter((r) => r.amount !== 0);
  return (
    <details className="ledger" open>
      <summary>Your Hero so far</summary>
      <dl className="ledger-traits">
        {TRAITS.map((t) => (
          <div key={t}>
            <dt>{TRAIT_NAMES[t]}</dt>
            <dd>
              <strong>{sign(d.traits[t])}</strong>
              <span className="ledger-src">{row(t).map((r) => `${r.source} ${sign(r.amount)}`).join(", ") || "—"}</span>
            </dd>
          </div>
        ))}
      </dl>
      <dl className="ledger-stats">
        <div><dt>Proficiency bonus</dt><dd>{sign(d.proficiencyBonus)}</dd></div>
        <div><dt>Evasion</dt><dd>{d.evasion}</dd></div>
        <div><dt>Hit Point slots</dt><dd>{d.slots.hp}</dd></div>
        <div><dt>Willpower slots</dt><dd>{d.slots.willpower}</dd></div>
        <div><dt>Damage thresholds</dt><dd>{d.thresholds.minor} / {d.thresholds.major} / {d.thresholds.severe} / {d.thresholds.massive}</dd></div>
      </dl>
    </details>
  );
}
