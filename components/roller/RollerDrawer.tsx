"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { applyWillpower, resolveRoll, settle, type RollOutcome, type SettledRoll, willpowerPenalty } from "@/lib/dyad";
import type { DiceStage } from "./diceStage";

/*
 * The Dyad Dice roller (spec: mtfbwy-dice-roller SPEC.md, revision 3). Lives inside the Hero sheet, outside the tab panels,
 * so it keeps its state while the player switches tabs. It changes the Hero's Willpower on the sheet and adds to the
 * campaign's Despair pool. Roll state is in memory only.
 */

type Phase = "idle" | "rolling" | "awaiting" | "resolved";

interface Props {
  characterId: string;
  wpUsed: number;
  wpMax: number;
  /** Sets the number of marked Willpower slots on the sheet */
  setWillpower: (marked: number) => void;
  /** Adds Despair to the character's pool; resolves with the server's figure, or null if it couldn't be saved */
  addDespair: (body: { characterId: string; rollId: string; delta: number } & Record<string, unknown>) => Promise<{ value: number; clamped: boolean; applied: boolean } | null>;
}

const sign = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);

export function RollerDrawer({ characterId, wpUsed, wpMax, setWillpower, addDespair }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [modifier, setModifier] = useState("0");
  const [roll, setRoll] = useState<RollOutcome | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [applied, setApplied] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [peek, setPeek] = useState(false);
  const stage = useRef<DiceStage | null>(null);
  const stageFailed = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wp = useRef({ used: wpUsed, max: wpMax });
  wp.current = { used: wpUsed, max: wpMax };
  const busy = useRef(false);
  const titleId = useId();

  const awaiting = phase === "awaiting";

  // Where the dice may land: everything the drawer isn't covering
  const freeArea = useCallback((peekNow: boolean) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const lg = W > 768;
    if (!open) return { x0: 0, y0: 0, x1: W, y1: H };
    return lg ? { x0: 0, y0: 0, x1: Math.max(200, W - 380), y1: H } : { x0: 0, y0: 0, x1: W, y1: Math.round(H * (peekNow ? 0.62 : 0.12)) };
  }, [open]);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // Esc closes; focus moves in on open
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeDrawer]);

  useEffect(() => () => {
    clearTimeout(fadeTimer.current);
    stage.current?.dispose();
  }, []);

  /** Loads the 3D dice the first time they're needed. Falls back to plain random numbers if WebGL or the model isn't available. */
  async function ensureStage() {
    if (stage.current || stageFailed.current) return;
    try {
      if (typeof window === "undefined" || !canvasRef.current) throw new Error("no canvas");
      const probe = document.createElement("canvas");
      if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("no webgl");
      const { createDiceStage } = await import("./diceStage");
      stage.current = await createDiceStage(canvasRef.current);
    } catch {
      stageFailed.current = true;
    }
  }

  async function doRoll() {
    if (busy.current || awaiting) return;
    busy.current = true;
    clearTimeout(fadeTimer.current);
    setPhase("rolling");
    setApplied([]);
    setMessage("");
    setRoll(null);
    const penaltyNow = willpowerPenalty(wp.current.used); // the count before this roll's own effects
    setPenalty(penaltyNow);
    const mod = parseInt(modifier, 10) || 0;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth <= 768;
    if (small) setPeek(true);

    let dice: { balance: number; despair: number };
    if (!reduced) await ensureStage();
    if (stage.current && !reduced) {
      const force = process.env.NODE_ENV !== "production" ? (window as unknown as { __dyadForce?: { balance: number; despair: number } }).__dyadForce : undefined;
      const thrown = await stage.current.throwDice(freeArea(true), force);
      if (process.env.NODE_ENV !== "production") (window as unknown as { __dyadFlat?: number[] }).__dyadFlat = [...((window as unknown as { __dyadFlat?: number[] }).__dyadFlat ?? []), thrown.flatness];
      dice = thrown;
    } else {
      // No WebGL (or reduced motion): same rules, no animation
      dice = { balance: 1 + Math.floor(Math.random() * 12), despair: 1 + Math.floor(Math.random() * 12) };
      await new Promise((r) => setTimeout(r, reduced ? 0 : 400));
    }
    const out = resolveRoll({ ...dice, modifier: mod - penaltyNow });
    setPeek(false);
    busy.current = false;
    // The total shows the modifier and penalty separately
    setRoll(out);
    if (out.pending) setPhase("awaiting");
    else await finish(out, mod, penaltyNow);
  }

  const fadeLater = () => {
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => stage.current?.fade(), 2600);
  };

  async function choose(succeeded: boolean) {
    if (!roll || !roll.pending || busy.current) return;
    busy.current = true; // one press only: a double-tap can't apply twice
    const mod = (roll.modifier ?? 0) + penalty;
    await finish(settle(roll, succeeded), mod, penalty);
    busy.current = false;
  }

  function disregard() {
    if (busy.current) return;
    setRoll(null);
    setPhase("idle");
    setMessage("Roll disregarded");
    fadeLater();
  }

  /** Applies a settled roll to the sheet once: Despair first (safe to retry), then Willpower */
  async function finish(out: SettledRoll, mod: number, penaltyUsed: number) {
    setRoll(out);
    setPhase("resolved");
    const notes: string[] = [];
    const rollId = newId();
    const w = applyWillpower(wp.current.used, wp.current.max, out);
    const wpDelta = w.marked - wp.current.used;

    let despairNote = "";
    if (out.effects.gmDespair > 0) {
      const res = await addDespair({ characterId, rollId, delta: out.effects.gmDespair, balance: out.balance, despair: out.despair, modifier: mod, penalty: penaltyUsed, kind: out.kind, wpDelta });
      if (!res) despairNote = "Couldn’t add to the Despair pool. Check your connection and tell the GM.";
      else if (res.clamped) despairNote = res.applied ? "The Despair pool is at its highest (12), so not all of it was added." : "";
      else despairNote = `Despair pool +${out.effects.gmDespair}.`;
    }
    if (out.effects.willpower.op !== "none") {
      if (wp.current.max === 0) notes.push("No Willpower slots are unlocked, so nothing changed.");
      else if (!w.changed) notes.push(out.effects.willpower.op === "clear" ? "No Willpower slots were marked, so there was nothing to clear." : "Every Willpower slot was already marked.");
      else {
        setWillpower(w.marked);
        notes.push("Willpower updated.");
      }
    }
    if (despairNote) notes.push(despairNote);
    if (w.exhausted && w.changed) notes.push("Every Willpower slot is marked.");
    setApplied(notes);
    setLog((l) => [`${out.balance} + ${out.despair}${mod ? ` ${sign(mod)}` : ""}${penaltyUsed ? ` − ${penaltyUsed}` : ""} = ${out.total} · ${out.label}`, ...l].slice(0, 6));
    fadeLater();
  }

  const tone = roll?.tone;
  const shown = roll;
  const modNum = parseInt(modifier, 10) || 0;

  return (
    <>
      {/* The dice are drawn here: above the page, below the drawer, and never in the way of a tap */}
      <canvas ref={canvasRef} className="dice-canvas" aria-hidden="true" />

      <button
        ref={triggerRef}
        type="button"
        className="roller-trigger"
        aria-label="Open dice roller"
        title="Roll the dice"
        aria-expanded={open}
        aria-controls="roller-drawer"
        onClick={() => setOpen(true)}
      >
        <svg className="roller-die" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <polygon points="41.0,4.4 55.5,15.0 61.0,32.0 55.5,49.0 41.0,59.6 23.0,59.6 8.5,49.0 3.0,32.0 8.5,15.0 23.0,4.4" fill="currentColor" />
          <polygon points="32.0,18.0 45.3,27.7 40.2,43.3 23.8,43.3 18.7,27.7" fill="none" stroke="var(--page-bg)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M32.0 18.0L41.0 4.4M45.3 27.7L55.5 15.0M40.2 43.3L55.5 49.0M23.8 43.3L23.0 59.6M18.7 27.7L3.0 32.0" stroke="var(--page-bg)" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
        {(awaiting || (roll?.pending && !open)) && <span className="roller-badge" aria-hidden="true" />}
        {awaiting && <span className="sr-only">A roll is waiting for you to say whether it succeeded</span>}
      </button>

      <aside
        id="roller-drawer"
        ref={drawerRef}
        className={`roller ${open ? "open" : ""} ${peek ? "peek" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="roller-handle" aria-hidden="true" />
        <div className="roller-head">
          <h2 id={titleId}>Dyad Dice</h2>
          <button ref={closeRef} type="button" className="roller-close" onClick={closeDrawer} aria-label="Close dice roller">×</button>
        </div>

        <div className="roller-body">
          <div className="field">
            <label htmlFor="roller-mod">Modifier</label>
            <input id="roller-mod" type="number" inputMode="numeric" step={1} value={modifier} disabled={phase === "rolling" || awaiting} onChange={(e) => setModifier(e.target.value)} />
          </div>
          {willpowerPenalty(wpUsed) > 0 && <p className="roller-penalty">Willpower penalty −{willpowerPenalty(wpUsed)}</p>}

          <button type="button" className="btn roller-roll" disabled={phase === "rolling" || awaiting} onClick={doRoll}>
            {phase === "rolling" ? "Rolling…" : "Roll Dyad Dice"}
          </button>

          {shown && (
            <p className="roller-readout" aria-label="The roll">
              <span className="die balance">{shown.balance}</span> + <span className="die despair">{shown.despair}</span>
              {modNum || penalty ? <> {modNum ? sign(modNum) : ""}{penalty ? ` − ${penalty}` : ""}</> : null} = <b>{shown.balance + shown.despair + modNum - penalty}</b>
            </p>
          )}

          <div className={`roller-banner ${tone ?? ""}`} role="status" aria-live="polite">
            {phase === "rolling" && <p className="muted">Rolling…</p>}
            {shown && phase !== "rolling" && (
              <>
                <p className="roller-title">{shown.label}</p>
                {shown.pending ? (
                  <p>{shown.tone === "balance" ? "Your Balance die is higher." : "The Despair die is higher."} Did the roll succeed?</p>
                ) : (
                  <>
                    <ul>{shown.lines.map((l) => <li key={l}>{l}</li>)}</ul>
                    {applied.length > 0 && <p className="roller-applied">{applied.join(" ")}</p>}
                  </>
                )}
              </>
            )}
            {phase === "idle" && message && <p className="muted">{message}</p>}
          </div>

          {awaiting && (
            <div className="roller-choices">
              <button type="button" className="btn" onClick={() => choose(true)}>This roll succeeded</button>
              <button type="button" className="btn" onClick={() => choose(false)}>This roll failed</button>
              <button type="button" className="roller-disregard" onClick={disregard}>Disregard roll</button>
            </div>
          )}

          {log.length > 0 && (
            <section aria-label="Recent rolls">
              <h3 className="roller-log-title">Recent rolls</h3>
              <ul className="roller-log">{log.map((l, i) => <li key={`${l}-${i}`}>{l}</li>)}</ul>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

