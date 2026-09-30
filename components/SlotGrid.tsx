import { MAX_SLOTS } from "@/lib/types";

interface Props {
  max: number;
  used: number;
  label: string;
  /** Omit for a read-only display */
  onChange?: (used: number) => void;
  mini?: boolean;
  /** Willpower: slots 7 to 12 show their roll penalty (-2 ... -12) inside the cell, in every state */
  penalties?: boolean;
}

/** Penalty printed in slot i (0-based): none for the first six, then -2, -4 ... -12. */
const penaltyFor = (i: number) => (i >= 6 ? `-${(i - 5) * 2}` : null);

/** 12 slots: filled = used, gold outline = available, navy outline = locked (beyond max). */
export function SlotGrid({ max, used, label, onChange, mini, penalties }: Props) {
  return (
    <div className={`slots ${mini ? "mini" : ""}`} role={onChange ? "group" : "img"} aria-label={`${label}: ${used} of ${max} used`}>
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const state = i < used ? "used" : i < max ? "avail" : "locked";
        const penalty = penalties && !mini ? penaltyFor(i) : null;
        const name = `${label} slot ${i + 1}${penalty ? `, ${penalty} to action rolls` : ""}`;
        if (!onChange || state === "locked") {
          return <span key={i} className={`slot ${state}`} aria-label={penalty ? name : undefined}>{penalty}</span>;
        }
        return (
          <button
            key={i}
            type="button"
            className={`slot ${state}`}
            aria-pressed={state === "used"}
            aria-label={name}
            // Tapping the last used slot un-ticks it, otherwise tick up to this slot
            onClick={() => onChange(i + 1 === used ? i : i + 1)}
          >
            {penalty}
          </button>
        );
      })}
    </div>
  );
}
