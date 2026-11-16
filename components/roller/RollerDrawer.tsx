"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { applyWillpower, resolveRoll, settle, type RollOutcome, type SettledRoll, willpowerPenalty } from "@/lib/dyad";
import type { DiceStage, DieSpec } from "./diceStage";

/*
 * The Dyad Dice roller (spec: mtfbwy-dice-roller SPEC.md, revision 3). Lives inside the Hero sheet, outside the tab panels,
 * so it keeps its state while the player switches tabs. It changes the Hero's Willpower on the sheet and adds to the
 * campaign's Despair pool. Roll state is in memory only.
 *
 * A skill, saving roll or trait on the sheet opens it ready for that check, with its modifier already applied (see `request`).
 * The Willpower adjustment (-2 for each slot marked past the sixth) is always applied and shown. Advantage and Disadvantage are a
 * d6 added to or taken from the total, so they are thrown alongside the Dyad and the sum is done here; the player can add as many
 * as the rules give (a ritual can add more than one). "More options" holds an extra modifier, extra dice (damage and so on,
 * thrown with the roll and summed on their own, not added to the Dyad total) and a switch to leave the Dyad out.
 */

type Phase = "idle" | "rolling" | "awaiting" | "resolved";

/** Asks the roller to open ready for a particular check */
export interface RollRequest {
  /** Changes with every request, so asking twice for the same check still opens it */
  id: number;
  label: string;
  /** What sort of roll this is, for the title: "Make a skill roll", "Make a saving roll". A class die uses its own name. */
  kind: "skill" | "saving" | "trait" | "attack" | "die";
  /** The check's own modifier, applied automatically */
  modifier: number;
  /** Where Advantage or Disadvantage might come from, shown as a reminder: they are situational, so the player adds the dice */
  advantage?: string[];
  disadvantage?: string[];
  /** A dice-only roll (a class die such as the Mystic Die): these dice are thrown straight away, with no Dyad */
  dice?: Partial<Record<"d4" | "d6" | "d8" | "d10" | "d12" | "d20", number>>;
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
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);

/** The extra dice a player can add. d4, d8 and d10 use the g-dice models, which show each number on three faces. */
const EXTRAS = [
  { key: "d4", sides: 4, spec: { type: "g4", look: "cream" } },
  { key: "d6", sides: 6, spec: { type: "d6", look: "cream" } },
  { key: "d8", sides: 8, spec: { type: "g8", look: "cream" } },
  { key: "d10", sides: 10, spec: { type: "g10", look: "cream" } },
  { key: "d12", sides: 12, spec: { type: "d12", look: "cream" } },
  { key: "d20", sides: 20, spec: { type: "d20", look: "cream" } },
] as const satisfies readonly { key: string; sides: number; spec: DieSpec }[];
type ExtraKey = (typeof EXTRAS)[number]["key"];
type Extras = Record<ExtraKey, number>;
const MAX_EACH = 8;
const noExtras = (): Extras => ({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 });

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

interface RollOptions {
  extras?: Extras;
  noDyad?: boolean;
}

export function RollerDrawer({ characterId, wpUsed, wpMax, request, setWillpower, addDespair }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState(""); // what is being rolled, such as Perception
  const [action, setAction] = useState("action"); // the sort of roll, for the title: skill, saving, attack... or just action
  const [baseMod, setBaseMod] = useState(0); // the check's own modifier
  const [extraMod, setExtraMod] = useState("0"); // an additional modifier typed in "More options"
  const [hints, setHints] = useState<{ advantage: string[]; disadvantage: string[] }>({ advantage: [], disadvantage: [] });
  const [advCount, setAdvCount] = useState(0);
  const [disCount, setDisCount] = useState(0);
  const [extras, setExtras] = useState(noExtras);
  const [noDyad, setNoDyad] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [roll, setRoll] = useState<RollOutcome | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [extraResult, setExtraResult] = useState<{ rolls: { key: ExtraKey; value: number }[]; total: number } | null>(null);
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
  const rollBtnRef = useRef<HTMLButtonElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wp = useRef({ used: wpUsed, max: wpMax });
  wp.current = { used: wpUsed, max: wpMax };
  const busy = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const focusRoll = useRef(false);
  const autoRoll = useRef<RollOptions | null>(null);
  const titleId = useId();

  const awaiting = phase === "awaiting";
  const locked = phase === "rolling" || awaiting;
  const wpAdjust = willpowerPenalty(wpUsed); // how much to take off, from the slots marked right now

  // Where the dice may land: everything the drawer isn't covering
  const freeArea = useCallback((peekNow: boolean) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const lg = W > 768;
    if (!open) return { x0: 0, y0: 0, x1: W, y1: H };
    return lg ? { x0: 0, y0: 0, x1: Math.max(200, W - 380), y1: H } : { x0: 0, y0: 0, x1: W, y1: Math.round(H * (peekNow ? 0.62 : 0.12)) };
  }, [open]);

  /** Opened from the button at the corner rather than from a check on the sheet: a plain action roll with nothing filled in */
  function openPlain() {
    if (!open && !busy.current && phaseRef.current !== "rolling" && phaseRef.current !== "awaiting") {
      setLabel("");
      setAction("action");
      setBaseMod(0);
      setExtraMod("0");
      setHints({ advantage: [], disadvantage: [] });
      setAdvCount(0);
      setDisCount(0);
      setExtras(noExtras());
      setNoDyad(false);
      setRoll(null);
      setExtraResult(null);
      setApplied([]);
      setMessage("");
      setPhase("idle");
    }
    setOpen(true);
  }

  const closeDrawer = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // A skill, saving roll, trait or class die asked for the roller: open it ready for that
  useEffect(() => {
    if (!request) return;
    setOpen(true);
    if (busy.current || phaseRef.current === "rolling" || phaseRef.current === "awaiting") return; // finish the roll in hand first
    setLabel(request.label);
    setAction(request.kind === "die" ? request.label : request.kind);
    setBaseMod(request.modifier);
    setExtraMod("0");
    setHints({ advantage: request.advantage ?? [], disadvantage: request.disadvantage ?? [] });
    setAdvCount(0);
    setDisCount(0);
    setRoll(null);
    setExtraResult(null);
    setApplied([]);
    setMessage("");
    setPhase("idle");
    if (request.dice) {
      const wanted = { ...noExtras(), ...request.dice };
      setExtras(wanted);
      setNoDyad(true);
      setMoreOpen(true);
      autoRoll.current = { extras: wanted, noDyad: true };
      return;
    }
    setExtras(noExtras());
    setNoDyad(false);
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

  // A class die was asked for: once the drawer is open (so the dice land clear of it), throw it
  useEffect(() => {
    if (!open || !autoRoll.current) return;
    const wanted = autoRoll.current;
    autoRoll.current = null;
    const f = requestAnimationFrame(() => void doRoll(wanted));
    return () => cancelAnimationFrame(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request]);

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

  /** One roll: the Dyad (unless it is left out), any Advantage and Disadvantage d6s, and any extra dice, all thrown together */
  async function doRoll(opts?: RollOptions) {
    if (busy.current || awaiting) return;
    const extrasNow = opts?.extras ?? extras;
    const dyad = !(opts?.noDyad ?? noDyad);
    const chosen = EXTRAS.flatMap((o) => Array.from({ length: extrasNow[o.key] }, () => o));
    if (!dyad && !chosen.length) return;
    busy.current = true;
    clearTimeout(fadeTimer.current);
    setPhase("rolling");
    setApplied([]);
    setMessage("");
    setRoll(null);
    setExtraResult(null);
    const penaltyNow = willpowerPenalty(wp.current.used); // the count before this roll's own effects
    setPenalty(penaltyNow);
    const mod = baseMod + (parseInt(extraMod, 10) || 0);
    const nAdv = dyad ? advCount : 0;
    const nDis = dyad ? disCount : 0;
    const specs: DieSpec[] = [
      ...(dyad ? ([{ type: "d12", look: "balance" }, { type: "d12", look: "despair" }] as DieSpec[]) : []),
      ...Array.from({ length: nAdv }, () => ({ type: "d6", look: "advantage" }) as DieSpec),
      ...Array.from({ length: nDis }, () => ({ type: "d6", look: "disadvantage" }) as DieSpec),
      ...chosen.map((o) => o.spec as DieSpec),
    ];
    const sides = [...(dyad ? [12, 12] : []), ...Array(nAdv + nDis).fill(6), ...chosen.map((o) => o.sides)];
    const values = await throwThese(specs, sides);
    const at = dyad ? 2 : 0;
    const extraValues = values.slice(at + nAdv + nDis);
    const rolls = chosen.map((o, i) => ({ key: o.key, value: extraValues[i] }));
    const extraTotal = extraValues.reduce((a, b) => a + b, 0);
    setPeek(false);
    busy.current = false;
    setAdvCount(0); // Advantage and Disadvantage are situational, so each roll starts without them
    setDisCount(0);
    if (rolls.length) setExtraResult({ rolls, total: extraTotal });
    const named = EXTRAS.filter((o) => extrasNow[o.key] > 0).map((o) => `${extrasNow[o.key]}${o.key}`).join(" ");
    if (!dyad) {
      setPhase("idle");
      setLog((l) => [`${label ? `${label}, ` : ""}${named}: ${extraValues.join(" + ")} = ${extraTotal}`, ...l].slice(0, 6));
      fadeLater();
      return;
    }
    const out = resolveRoll({ balance: values[0], despair: values[1], modifier: mod - penaltyNow, advantage: values.slice(at, at + nAdv), disadvantage: values.slice(at + nAdv, at + nAdv + nDis) });
    // The total shows the modifier and the Willpower adjustment separately
    setRoll(out);
    if (named) setMessage("");
    if (out.pending) setPhase("awaiting");
    else await finish(out, mod, penaltyNow, named ? `${named}: ${extraValues.join(" + ")} = ${extraTotal}` : "");
  }

  const fadeLater = () => {
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => stage.current?.fade(), 2600);
  };

  async function choose(succeeded: boolean) {
    if (!roll || !roll.pending || busy.current) return;
    busy.current = true; // one press only: a double-tap can't apply twice
    const mod = (roll.modifier ?? 0) + penalty;
    await finish(settle(roll, succeeded), mod, penalty, extraResult ? `${extraResult.rolls.map((r) => r.value).join(" + ")} = ${extraResult.total}` : "");
    busy.current = false;
  }

  function disregard() {
    if (busy.current) return;
    setRoll(null);
    setExtraResult(null);
    setPhase("idle");
    setMessage("Roll disregarded");
    fadeLater();
  }

  /** Applies a settled roll to the sheet once: Despair first (safe to retry), then Willpower */
  async function finish(out: SettledRoll, mod: number, penaltyUsed: number, extrasNote: string) {
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
    setLog((l) => [`${label ? `${label}: ` : ""}${dice} = ${out.total} · ${out.label}${extrasNote ? `; ${extrasNote}` : ""}`, ...l].slice(0, 6));
    fadeLater();
  }

  const tone = roll?.tone;
  const shown = roll;
  const modNum = baseMod + (parseInt(extraMod, 10) || 0);
  const extrasCount = EXTRAS.reduce((n, o) => n + extras[o.key], 0);
  const nothingToRoll = noDyad && extrasCount === 0;

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
        onClick={openPlain}
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
          <h2 id={titleId}>Make {/^[aeiou]/i.test(action) ? "an" : "a"} {action} roll</h2>
          <button ref={closeRef} type="button" className="roller-close" onClick={closeDrawer} aria-label="Close dice roller">×</button>
        </div>

        <div className="roller-body">
          <p className="roller-lead">{noDyad ? "Roll your extra dice" : "Roll your Dyad Dice"}</p>

          <dl className="roller-sums">
            {label && !noDyad ? <div><dt>{label} modifier</dt><dd>{signed(baseMod)}</dd></div> : null}
            <div>
              <dt>Willpower adjustment</dt>
              <dd>{wpAdjust ? `−${wpAdjust}` : "None"}</dd>
            </div>
          </dl>
          {wpAdjust > 0 && <p className="roller-hint">{wpUsed} Willpower slots are marked, so every Dyad roll takes off 2 for each past the sixth.</p>}

          {!noDyad && (
            <div className="roller-steppers">
              <Stepper label="Advantage (+d6)" value={advCount} onChange={setAdvCount} disabled={locked} />
              <Stepper label="Disadvantage (−d6)" value={disCount} onChange={setDisCount} disabled={locked} />
              {hints.advantage.length > 0 && <p className="roller-hint">Advantage may apply, from {hints.advantage.join(", ")}.</p>}
              {hints.disadvantage.length > 0 && <p className="roller-hint">Disadvantage may apply, from {hints.disadvantage.join(", ")}.</p>}
            </div>
          )}

          <button ref={rollBtnRef} type="button" className="btn roller-roll" disabled={locked || nothingToRoll} onClick={() => doRoll()}>
            {phase === "rolling" ? "Rolling…" : "Roll"}
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

          {extraResult && (
            <p className="roller-readout" aria-label="The extra dice">
              {extraResult.rolls.map((r, i) => (
                <span key={i} className="roller-bonus">
                  {i > 0 && <span>+</span>}
                  <span className="die other" aria-label={`${r.key} ${r.value}`}>{r.value}</span>
                </span>
              ))}
              <span>=</span>
              <b>{extraResult.total}</b>
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

          <details className="roller-others" open={moreOpen} onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>More options</summary>
            <div className="field">
              <label htmlFor="roller-mod">Add additional modifier</label>
              <input id="roller-mod" type="number" inputMode="numeric" step={1} value={extraMod} disabled={locked} onChange={(e) => setExtraMod(e.target.value)} />
            </div>
            <fieldset className="roller-extras">
              <legend>Add additional dice</legend>
              <p className="muted roller-others-note">Thrown with this roll and added up on their own. They aren’t added to the Dyad total.</p>
              <div className="roller-steppers">
                {EXTRAS.map((o) => (
                  <Stepper key={o.key} label={o.key} value={extras[o.key]} disabled={locked} onChange={(n) => setExtras((s) => ({ ...s, [o.key]: n }))} />
                ))}
              </div>
            </fieldset>
            <label className="roller-check">
              <input type="checkbox" checked={noDyad} disabled={locked} onChange={(e) => setNoDyad(e.target.checked)} />
              <span>Remove Dyad Dice</span>
            </label>
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
