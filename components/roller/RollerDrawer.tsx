"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { applyWillpower, resolveRoll, settle, type RollOutcome, type SettledRoll, willpowerPenalty } from "@/lib/dyad";
import type { DiceStage, DieSpec } from "./diceStage";

/*
 * The Dyad Dice roller (spec: mtfbwy-dice-roller SPEC.md, revision 3). Lives inside the Hero sheet, outside the tab panels,
 * so it keeps its state while the player switches tabs. It changes the Hero's Willpower on the sheet and adds to the
 * campaign's Despair pool. Roll state is in memory only.
 *
 * A skill, saving roll or trait on the sheet can open it with the modifier filled in (see `request`). Advantage and Disadvantage
 * are a d6 added to or taken from the total, so they are thrown alongside the Dyad and the sum is done here; the player can add as
 * many as the rules give (a ritual can add more than one). Other dice (damage and so on) can be thrown separately.
 */

type Phase = "idle" | "rolling" | "awaiting" | "resolved";

/** Asks the roller to open ready for a particular check */
export interface RollRequest {
  /** Changes with every request, so asking twice for the same check still opens it */
  id: number;
  label: string;
  modifier: number;
  /** Where Advantage or Disadvantage might come from, shown as a reminder: they are situational, so the player adds the dice */
  advantage?: string[];
  disadvantage?: string[];
}

interface Props {
  characterId: string;
  wpUsed: number;
  wpMax: number;
  request?: RollRequest | null;
  /** Sets the number of marked Willpower slots on the sheet */
  setWillpower: (marked: number) => void;
  /** Adds Despair to the character's pool; resolves with the server's figure, or null if it couldn't be saved */
  addDespair: (body: { characterId: string; rollId: string; delta: number } & Record<string, unknown>) => Promise<{ value: number; clamped: boolean; applied: boolean } | null>;
}

const sign = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);

/** The other dice a player can throw. d4, d8 and d10 use the g-dice models, which show each number on three faces. */
const OTHERS = [
  { key: "d4", sides: 4, spec: { type: "g4", look: "slate" } },
  { key: "d6", sides: 6, spec: { type: "d6", look: "cream" } },
  { key: "d8", sides: 8, spec: { type: "g8", look: "slate" } },
  { key: "d10", sides: 10, spec: { type: "g10", look: "cream" } },
  { key: "d20", sides: 20, spec: { type: "d20", look: "slate" } },
] as const satisfies readonly { key: string; sides: number; spec: DieSpec }[];
type OtherKey = (typeof OTHERS)[number]["key"];
const MAX_EACH = 8;
const noOthers = (): Record<OtherKey, number> => ({ d4: 0, d6: 0, d8: 0, d10: 0, d20: 0 });

function Stepper({ label, value, onChange, disabled, max = MAX_EACH }: { label: string; value: number; onChange: (n: number) => void; disabled?: boolean; max?: number }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper-label" aria-hidden="true">{label}</span>
      <button type="button" className="stepper-btn" aria-label={`One fewer: ${label}`} disabled={disabled || value <= 0} onClick={() => onChange(value - 1)}>−</button>
      <output className="stepper-value" aria-live="polite">{value}</output>
      <button type="button" className="stepper-btn" aria-label={`One more: ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export function RollerDrawer({ characterId, wpUsed, wpMax, request, setWillpower, addDespair }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [modifier, setModifier] = useState("0");
  const [label, setLabel] = useState("");
  const [hints, setHints] = useState<{ advantage: string[]; disadvantage: string[] }>({ advantage: [], disadvantage: [] });
  const [advCount, setAdvCount] = useState(0);
  const [disCount, setDisCount] = useState(0);
  const [roll, setRoll] = useState<RollOutcome | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [applied, setApplied] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [peek, setPeek] = useState(false);
  const [others, setOthers] = useState(noOthers);
  const [othersResult, setOthersResult] = useState<{ rolls: { key: OtherKey; value: number }[]; total: number } | null>(null);
  const stage = useRef<DiceStage | null>(null);
  const stageFailed = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rollBtnRef = useRef<HTMLButtonElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wp = useRef({ used: wpUsed, max: wpMax });
  wp.current = { used: wpUsed, max: wpMax };
  const busy = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const focusRoll = useRef(false);
  const titleId = useId();

  const awaiting = phase === "awaiting";
  const locked = phase === "rolling" || awaiting;

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

  // A skill, saving roll or trait asked for the roller: open it ready for that check
  useEffect(() => {
    if (!request) return;
    setOpen(true);
    if (busy.current || phaseRef.current === "rolling" || phaseRef.current === "awaiting") return; // finish the roll in hand first
    setLabel(request.label);
    setModifier(String(request.modifier));
    setHints({ advantage: request.advantage ?? [], disadvantage: request.disadvantage ?? [] });
    setAdvCount(0);
    setDisCount(0);
    setRoll(null);
    setApplied([]);
    setMessage("");
    setPhase("idle");
    focusRoll.current = true;
  }, [request]);

  // Esc closes; focus moves in on open (to the Roll button when a check asked for it)
  useEffect(() => {
    if (!open) return;
    const target = focusRoll.current ? rollBtnRef.current : closeRef.current;
    focusRoll.current = false;
    // The drawer is inert until it opens, so wait a frame
    const f = requestAnimationFrame(() => (target ?? closeRef.current)?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(f);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeDrawer, request]);

  useEffect(() => () => {
    clearTimeout(fadeTimer.current);
    stage.current?.dispose();
  }, []);

  /** Loads the 3D dice the first time they're needed. Falls back to plain random numbers if WebGL or the models aren't available. */
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

  /** Throws dice and gives back what they show: thrown for real if we can, otherwise plain random numbers with the same rules */
  async function throwThese(specs: DieSpec[], sides: number[]): Promise<number[]> {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.innerWidth <= 768) setPeek(true);
    if (!reduced) await ensureStage();
    if (stage.current && !reduced) {
      const force = process.env.NODE_ENV !== "production" ? (window as unknown as { __dyadForce?: number[] }).__dyadForce : undefined;
      try {
        const area = process.env.NODE_ENV !== "production" ? (window as unknown as { __dyadArea?: { x0: number; y0: number; x1: number; y1: number } }).__dyadArea : undefined;
        const thrown = await stage.current.throwDice(area ?? freeArea(true), specs, force);
        if (process.env.NODE_ENV !== "production") (window as unknown as { __dyadFlat?: number[] }).__dyadFlat = [...((window as unknown as { __dyadFlat?: number[] }).__dyadFlat ?? []), thrown.flatness];
        return thrown.values;
      } catch {
        stageFailed.current = true; // a model that wouldn't load: carry on without the animation
      }
    }
    await new Promise((r) => setTimeout(r, reduced ? 0 : 400));
    return sides.map((n) => 1 + Math.floor(Math.random() * n));
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
    const nAdv = advCount;
    const nDis = disCount;
    const specs: DieSpec[] = [
      { type: "d12", look: "balance" },
      { type: "d12", look: "despair" },
      ...Array.from({ length: nAdv }, () => ({ type: "d6", look: "advantage" }) as DieSpec),
      ...Array.from({ length: nDis }, () => ({ type: "d6", look: "disadvantage" }) as DieSpec),
    ];
    const values = await throwThese(specs, specs.map((s) => (s.type === "d12" ? 12 : 6)));
    const out = resolveRoll({ balance: values[0], despair: values[1], modifier: mod - penaltyNow, advantage: values.slice(2, 2 + nAdv), disadvantage: values.slice(2 + nAdv) });
    setPeek(false);
    busy.current = false;
    setAdvCount(0); // Advantage and Disadvantage are situational, so each roll starts without them
    setDisCount(0);
    // The total shows the modifier and penalty separately
    setRoll(out);
    if (out.pending) setPhase("awaiting");
    else await finish(out, mod, penaltyNow);
  }

  /** Throws the chosen damage and other dice on their own: just the numbers and their sum, nothing on the sheet changes */
  async function doRollOthers() {
    if (busy.current || locked) return;
    const chosen = OTHERS.flatMap((o) => Array.from({ length: others[o.key] }, () => o));
    if (!chosen.length) return;
    busy.current = true;
    clearTimeout(fadeTimer.current);
    const before = phaseRef.current;
    setPhase("rolling");
    setOthersResult(null);
    const values = await throwThese(chosen.map((o) => o.spec), chosen.map((o) => o.sides));
    setPeek(false);
    busy.current = false;
    const rolls = chosen.map((o, i) => ({ key: o.key, value: values[i] }));
    const total = values.reduce((a, b) => a + b, 0);
    setOthersResult({ rolls, total });
    setPhase(before === "rolling" ? "idle" : before);
    const counts = OTHERS.filter((o) => others[o.key] > 0).map((o) => `${others[o.key]}${o.key}`).join(" ");
    setLog((l) => [`${counts}: ${values.join(" + ")} = ${total}`, ...l].slice(0, 6));
    fadeLater();
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
    const dice = `${out.balance} + ${out.despair}${mod ? ` ${sign(mod)}` : ""}${penaltyUsed ? ` − ${penaltyUsed}` : ""}${out.advantage.length ? ` + A(${out.advantage.join(", ")})` : ""}${out.disadvantage.length ? ` − D(${out.disadvantage.join(", ")})` : ""}`;
    setLog((l) => [`${label ? `${label}: ` : ""}${dice} = ${out.total} · ${out.label}`, ...l].slice(0, 6));
    fadeLater();
  }

  const tone = roll?.tone;
  const shown = roll;
  const modNum = parseInt(modifier, 10) || 0;
  const othersCount = OTHERS.reduce((n, o) => n + others[o.key], 0);

  return (
    <>
      {/* The dice are drawn here: above the page, below the drawer, and never in the way of a tap */}
      <canvas ref={canvasRef} className="dice-canvas" aria-hidden="true" />

      <button
        ref={triggerRef}
        type="button"
        className="roller-trigger"
        aria-label="Open dice roller"
        title="Open dice roller"
        aria-expanded={open}
        aria-controls="roller-drawer"
        onClick={() => setOpen(true)}
      >
        {/* The two d12s from the design file: one button, so both are decorative */}
        <span className="roller-dice" aria-hidden="true">
          <svg className="roller-die roller-die-upper" width="32" height="32" viewBox="0 0 32 32.7" focusable="false">
            <path d="M25.4928 3.39864L31.3596 11.3986L31.3596 21.2874L25.4928 29.2874L15.9996 32.343L6.50652 29.2874L0.639648 21.2874L0.639648 11.3986L6.50652 3.39864L15.9996 0.343018L25.4928 3.39864Z" fill="var(--roller-upper-fill)" fillRule="evenodd" clipRule="evenodd" />
            <path d="M16.0488 0.190521L25.542 3.24619L25.5908 3.26181L25.6221 3.3038L31.5195 11.3458L31.5195 21.3399L25.6221 29.3819L25.5908 29.4239L25.542 29.4395L16.0488 32.4952L15.999 32.5108L15.9502 32.4952L6.45703 29.4395L6.4082 29.4239L6.37695 29.3819L0.479492 21.3399L0.479492 11.3458L6.37695 3.3038L6.4082 3.26181L6.45703 3.24619L15.9502 0.190521L15.999 0.174896L16.0488 0.190521ZM10.0635 24.7872L6.83594 29.2257L15.999 32.1749L25.1621 29.2257L21.9375 24.7872L10.0635 24.7872ZM0.799805 21.2345L6.54883 29.0763L9.80273 24.5977L6.13281 13.3038L0.799805 11.5714L0.799805 21.2345ZM25.8652 13.3048L22.1953 24.5977L25.4482 29.0753L31.1992 21.2345L31.1992 11.5714L25.8652 13.3048ZM6.44824 13.2393L10.0967 24.4679L21.9023 24.4679L25.5498 13.2393L15.999 6.30087L6.44824 13.2393ZM16.1602 6.02158L25.7656 13.0011L31.0713 11.2774L25.3936 3.53427L16.1602 0.562592V6.02158ZM6.60449 3.53427L0.926758 11.2765L6.23242 13.0001L15.8398 6.0206V0.561615L6.60449 3.53427Z" fill="var(--roller-upper-line)" stroke="var(--roller-upper-line)" strokeWidth="0.333333" />
          </svg>
          <svg className="roller-die roller-die-lower" width="32" height="32" viewBox="22 0 32 32.7" focusable="false">
            <path d="M47.4928 3.39858L53.3596 11.3986V21.2873L47.4928 29.2873L37.9996 32.343L28.5065 29.2873L22.6396 21.2873L22.6396 11.3986L28.5065 3.39858L37.9996 0.342957L47.4928 3.39858Z" fill="var(--roller-lower-fill)" fillRule="evenodd" clipRule="evenodd" />
            <path d="M38.0493 0.19046L47.5425 3.24612L47.5913 3.26175L47.6226 3.30374L53.52 11.3457V21.3399L47.6226 29.3819L47.5913 29.4239L47.5425 29.4395L38.0493 32.4951L37.9995 32.5108L37.9507 32.4951L28.4575 29.4395L28.4087 29.4239L28.3774 29.3819L22.48 21.3399L22.48 11.3457L28.3774 3.30374L28.4087 3.26175L28.4575 3.24612L37.9507 0.19046L37.9995 0.174835L38.0493 0.19046ZM32.064 24.7871L28.8364 29.2256L37.9995 32.1748L47.1626 29.2256L43.938 24.7871L32.064 24.7871ZM22.8003 21.2344L28.5493 29.0762L31.8032 24.5977L28.1333 13.3037L22.8003 11.5713L22.8003 21.2344ZM47.8657 13.3047L44.1958 24.5977L47.4487 29.0752L53.1997 21.2344V11.5713L47.8657 13.3047ZM28.4487 13.2393L32.0972 24.4678L43.9028 24.4678L47.5503 13.2393L37.9995 6.30081L28.4487 13.2393ZM38.1606 6.02151L47.7661 13.001L53.0708 11.2764L47.394 3.53421L38.1606 0.562531V6.02151ZM28.605 3.53421L22.9272 11.2764L28.2329 13L37.8403 6.02054V0.561554L28.605 3.53421Z" fill="var(--roller-lower-line)" stroke="var(--roller-lower-line)" strokeWidth="0.333333" />
          </svg>
        </span>
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
          {label && <p className="roller-for">Rolling for <b>{label}</b></p>}
          <div className="field">
            <label htmlFor="roller-mod">Modifier</label>
            <input id="roller-mod" type="number" inputMode="numeric" step={1} value={modifier} disabled={locked} onChange={(e) => setModifier(e.target.value)} />
          </div>
          {willpowerPenalty(wpUsed) > 0 && <p className="roller-penalty">Willpower penalty −{willpowerPenalty(wpUsed)}</p>}

          <div className="roller-steppers">
            <Stepper label="Advantage (+d6)" value={advCount} onChange={setAdvCount} disabled={locked} />
            <Stepper label="Disadvantage (−d6)" value={disCount} onChange={setDisCount} disabled={locked} />
            {hints.advantage.length > 0 && <p className="roller-hint">Advantage may apply, from {hints.advantage.join(", ")}.</p>}
            {hints.disadvantage.length > 0 && <p className="roller-hint">Disadvantage may apply, from {hints.disadvantage.join(", ")}.</p>}
          </div>

          <button ref={rollBtnRef} type="button" className="btn roller-roll" disabled={locked} onClick={doRoll}>
            {phase === "rolling" ? "Rolling…" : "Roll Dyad Dice"}
          </button>

          {shown && (
            <p className="roller-readout" aria-label="The roll">
              <span className="die balance">{shown.balance}</span>
              <span>+</span>
              <span className="die despair">{shown.despair}</span>
              {modNum || penalty ? <span>{modNum ? sign(modNum) : ""}{penalty ? ` − ${penalty}` : ""}</span> : null}
              {shown.advantage.map((n, i) => <span key={`a${i}`} className="roller-bonus"><span>+</span><span className="die adv" aria-label={`Advantage die ${n}`}>{n}</span></span>)}
              {shown.disadvantage.map((n, i) => <span key={`d${i}`} className="roller-bonus"><span>−</span><span className="die dis" aria-label={`Disadvantage die ${n}`}>{n}</span></span>)}
              <span>=</span>
              <b>{shown.total}</b>
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

          <details className="roller-others">
            <summary>Other dice</summary>
            <p className="muted roller-others-note">Damage and other dice, thrown on their own. Nothing on your sheet changes.</p>
            <div className="roller-steppers">
              {OTHERS.map((o) => (
                <Stepper key={o.key} label={o.key} value={others[o.key]} max={MAX_EACH} disabled={locked} onChange={(n) => setOthers((s) => ({ ...s, [o.key]: n }))} />
              ))}
            </div>
            <button type="button" className="btn roller-roll" disabled={locked || othersCount === 0} onClick={doRollOthers}>Roll other dice</button>
            {othersResult && (
              <p className="roller-readout" aria-label="The other dice">
                {othersResult.rolls.map((r, i) => (
                  <span key={i} className="roller-bonus">
                    {i > 0 && <span>+</span>}
                    <span className="die other" aria-label={`${r.key} ${r.value}`}>{r.value}</span>
                  </span>
                ))}
                <span>=</span>
                <b>{othersResult.total}</b>
              </p>
            )}
          </details>

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
