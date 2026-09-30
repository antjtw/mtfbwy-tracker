import { MAX_SLOTS } from "@/lib/types";

interface Props {
  max: number;
  used: number;
  label: string;
  /** Omit for a read-only display */
  onChange?: (used: number) => void;
  mini?: boolean;
}

/** 12 slots: filled = used, gold outline = available, navy outline = locked (beyond max). */
export function SlotGrid({ max, used, label, onChange, mini }: Props) {
  return (
    <div className={`slots ${mini ? "mini" : ""}`} role={onChange ? "group" : "img"} aria-label={`${label}: ${used} of ${max} used`}>
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const state = i < used ? "used" : i < max ? "avail" : "locked";
        if (!onChange || state === "locked") return <span key={i} className={`slot ${state}`} />;
        return (
          <button
            key={i}
            type="button"
            className={`slot ${state}`}
            aria-pressed={state === "used"}
            aria-label={`${label} slot ${i + 1}`}
            // Tapping the last used slot un-ticks it, otherwise tick up to this slot
            onClick={() => onChange(i + 1 === used ? i : i + 1)}
          />
        );
      })}
    </div>
  );
}
