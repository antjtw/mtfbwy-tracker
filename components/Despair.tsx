"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { MAX_DESPAIR } from "@/lib/types";
import type { SyncState } from "./usePolledCharacters";

/*
 * Despair trackers (Figma "Despair tracker", hero 2088:23249 and GM 2088:23870).
 * Every level from 0 to 12 has its own colours, sampled from the Figma variants, and from level 3
 * the "reactor" artwork builds up: radiance, then crystal facets, seams, stress fractures and a burst edge.
 */

type Glow = [color: string, dropAlpha: number, dropBlur: number, innerAlpha: number, innerBlur: number];

interface Level {
  border: string;
  edge: string; // gradient ends
  mid: string; // gradient peak at 56%
  text: string;
  glow?: Glow;
}

const LEVELS: Level[] = [
  { border: "#58697f", edge: "#20252a", mid: "#20252a", text: "#a8b5c2" },
  { border: "#645d6a", edge: "#24252b", mid: "#2c272d", text: "#bcb2ba" },
  { border: "#795965", edge: "#27232a", mid: "#34252e", text: "#ceafb6" },
  { border: "#915363", edge: "#2a2027", mid: "#42242e", text: "#dda3ae" },
  { border: "#a94a5e", edge: "#2d1d24", mid: "#52222d", text: "#ea98a5", glow: ["#d74362", 0.094, 3, 0.082, 2] },
  { border: "#c23f56", edge: "#301a22", mid: "#64202d", text: "#f58d9b", glow: ["#e63255", 0.094, 4.625, 0.082, 2.75] },
  { border: "#de3450", edge: "#341720", mid: "#781c2d", text: "#fd6e6e", glow: ["#fa2a4d", 0.094, 6.25, 0.082, 3.5] },
  { border: "#f02c4b", edge: "#38141d", mid: "#8d192e", text: "#ff9199", glow: ["#ff284c", 0.094, 7.875, 0.082, 4.25] },
  { border: "#ff3454", edge: "#3d111b", mid: "#a51530", text: "#ffa4aa", glow: ["#ff3657", 0.22, 9.5, 0.239, 5] },
  { border: "#ff4965", edge: "#420f1a", mid: "#bd1231", text: "#ffb9be", glow: ["#ff4a69", 0.22, 11.125, 0.239, 5.75] },
  { border: "#ff617a", edge: "#480d18", mid: "#d10f34", text: "#ffcdd1", glow: ["#ff6982", 0.22, 12.75, 0.239, 6.5] },
  { border: "#ff8598", edge: "#4e0b17", mid: "#e40b35", text: "#ffdfe2", glow: ["#ff93a5", 0.4, 14.375, 0.239, 7.25] },
  { border: "#ffb2bd", edge: "#560914", mid: "#f90937", text: "#fff0f2", glow: ["#ffc1cc", 0.4, 16, 0.239, 8] },
];

/** Layer opacities per level: facets (in order), seams, luminous edge, stress fractures, burst edge */
const ART: Record<number, { facets: number[]; seams?: number; edge?: number; fractures?: number; burst?: number }> = {
  4: { facets: [], edge: 0.18 },
  5: { facets: [0.05], edge: 0.27 },
  6: { facets: [0.08, 0.07], edge: 0.36 },
  7: { facets: [0.09, 0.09, 0.07], seams: 0.18, edge: 0.45 },
  8: { facets: [0.12, 0.11, 0.11, 0.14], seams: 0.25, edge: 0.54 },
  9: { facets: [0.14, 0.13, 0.14, 0.19, 0.19], seams: 0.31, edge: 0.63 },
  10: { facets: [0.16, 0.15, 0.17, 0.23, 0.23, 0.28], seams: 0.37, edge: 0.72 },
  11: { facets: [0.17, 0.17, 0.21, 0.27, 0.26, 0.32, 0.45], seams: 0.44, edge: 0.81, fractures: 0.45 },
  12: { facets: [0.19, 0.19, 0.24, 0.31, 0.3, 0.36, 0.48], seams: 0.5, edge: 0.9, fractures: 0.85, burst: 0.9 },
};

// Paths from the 530x48 hero variant; the GM card uses the same artwork stretched to fit
const FACETS = [
  "M122 1H228L181 47H145Z",
  "M228 1H356L301 20L181 47Z",
  "M181 47L301 20L373 47Z",
  "M356 1H435L394 29L301 20Z",
  "M301 20L394 29L432 47H373Z",
  "M181 47L248 34L228 1L262 28Z",
  "M394 29L435 1L414 34L432 47Z",
];
const SEAMS = "M145 47H181M181 47L228 1M181 47L301 20M301 20L356 1M301 20L373 47M301 20L394 29L435 1";
const EDGE = "M110 1H430M142 47H419";
const FRACTURES = "M248 1L262 13L255 18L281 31L292 47M407 1L389 12L400 19L394 29L405 39L399 47";
const BURST = "M177 1H220M351 1H375M239 47H270M398 47H422M1 9V18M529 29V39";

export function clampDespair(n: number) {
  return Math.max(0, Math.min(MAX_DESPAIR, Math.round(n) || 0));
}

function levelStyle(value: number): CSSProperties {
  const l = LEVELS[clampDespair(value)];
  const glow = l.glow;
  const alpha = (hex: string, a: number) =>
    `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;
  return {
    "--despair-border": l.border,
    "--despair-text": l.text,
    "--despair-bg": `linear-gradient(90deg, ${l.edge} 0%, ${l.mid} 56%, ${l.edge} 100%)`,
    "--despair-shadow": glow
      ? `0 0 ${glow[2]}px ${value === 12 ? 1 : 0}px ${alpha(glow[0], glow[1])}, inset 0 0 ${glow[4]}px ${alpha(glow[0], glow[3])}`
      : "none",
  } as CSSProperties;
}

function radianceOf(value: number): [string, number] | null {
  if (value < 3) return null;
  return [value === 3 ? "#bf526b" : LEVELS[value].glow![0], value < 7 ? 0.071 : 0.22];
}

/** The layered "reactor" artwork behind the text. Purely decorative. */
function DespairArt({ value }: { value: number }) {
  const id = useId().replace(/:/g, "");
  const art = ART[value];
  const radiance = radianceOf(value);
  if (!art && !radiance) return null;
  return (
    <svg className="despair-art" viewBox="0 0 530 48" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="530" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffc1cc" />
          <stop offset="0.56" stopColor="#ffc1cc" />
          <stop offset="1" stopColor="#ff2543" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="530" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffc1cc" stopOpacity="0" />
          <stop offset="0.56" stopColor="#ffc1cc" />
          <stop offset="1" stopColor="#ffc1cc" stopOpacity="0" />
        </linearGradient>
        {radiance && (
          // Figma's rotated radial "Reactor radiance", centred low and right of middle
          <radialGradient
            id={`${id}r`}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="matrix(128.8 -34.5 -151.3 -23 293 42.4)"
          >
            <stop stopColor={radiance[0]} stopOpacity={radiance[1]} />
            <stop offset="1" stopColor={radiance[0]} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {radiance && <rect x="116" y="1" width="322" height="46" fill={`url(#${id}r)`} />}
      {art?.facets.map((o, i) => <path key={i} d={FACETS[i]} fill={`url(#${id}f)`} opacity={o} />)}
      <g fill="none">
        {art?.seams && <path d={SEAMS} stroke="#ffc1cc" strokeWidth="0.65" opacity={art.seams} vectorEffect="non-scaling-stroke" />}
        {art?.edge && <path d={EDGE} stroke={`url(#${id}e)`} strokeWidth="1.2" opacity={art.edge} vectorEffect="non-scaling-stroke" />}
        {art?.fractures && (
          <path d={FRACTURES} stroke="#ffc1cc" strokeWidth="0.9" opacity={art.fractures} vectorEffect="non-scaling-stroke" />
        )}
        {art?.burst && <path d={BURST} stroke="#ffe4e9" strokeWidth="1.1" opacity={art.burst} vectorEffect="non-scaling-stroke" />}
      </g>
    </svg>
  );
}

/** Players' read-only bar: "DESPAIR  N / 12" */
export function DespairBar({ value, adventure }: { value: number; adventure: string }) {
  const v = clampDespair(value);
  return (
    <section className={`despair despair-bar ${v >= 11 ? "despair-thick" : ""}`} style={levelStyle(v)} aria-label={`Despair for ${adventure}`}>
      <DespairArt value={v} />
      <h2 className="despair-title">Despair</h2>
      <p className="despair-value" aria-hidden="true">
        {v} / {MAX_DESPAIR}
      </p>
      <p className="sr-only" role="status">{`${v} of ${MAX_DESPAIR} despair`}</p>
    </section>
  );
}

function MinusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** GM card: steppers plus twelve boxes; tapping a box sets despair to it, tapping the top filled box clears it */
export function DespairEditor({
  value,
  adventure,
  onChange,
}: {
  value: number;
  adventure: string;
  onChange: (n: number) => void;
}) {
  const v = clampDespair(value);
  return (
    <section className="despair despair-card" style={levelStyle(v)} aria-labelledby="despair-title">
      <DespairArt value={v} />
      <div className="despair-summary">
        <div>
          <h2 className="despair-title" id="despair-title">Despair</h2>
          <p className="despair-owner">Shared with all players in {adventure}</p>
        </div>
        <div className="despair-stepper">
          <button aria-label={`Decrease despair for ${adventure}`} disabled={v <= 0} onClick={() => onChange(v - 1)}>
            <MinusIcon />
          </button>
          <output className="despair-value" aria-live="polite" aria-label={`${v} of ${MAX_DESPAIR} despair`}>
            {v} / {MAX_DESPAIR}
          </output>
          <button aria-label={`Increase despair for ${adventure}`} disabled={v >= MAX_DESPAIR} onClick={() => onChange(v + 1)}>
            <PlusIcon />
          </button>
        </div>
      </div>
      <div className="despair-positions" role="group" aria-label={`Set despair for ${adventure}`}>
        {Array.from({ length: MAX_DESPAIR }, (_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              className="despair-position"
              aria-pressed={n <= v}
              aria-label={`Despair ${n}`}
              onClick={() => onChange(n === v ? n - 1 : n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="despair-legend" aria-hidden="true">
        <span>0 · No filled boxes</span>
        <span>12 · All boxes filled</span>
      </div>
    </section>
  );
}

/**
 * Despair for every pool, kept in sync by polling (the GM's changes reach players within a couple
 * of seconds), with optimistic edits for the GM.
 */
export function usePolledDespair(initial: Record<string, number>, intervalMs = 2000) {
  const [values, setValues] = useState(initial);
  const [sync, setSync] = useState<SyncState>("synced");
  const inFlight = useRef(0);
  const lastEdit = useRef(0);

  const refresh = useCallback(async () => {
    if (inFlight.current > 0 || Date.now() - lastEdit.current < 1500) return;
    try {
      const res = await fetch("/api/despair", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const next: Record<string, number> = await res.json();
      if (inFlight.current === 0 && Date.now() - lastEdit.current >= 1500) {
        setValues(next);
        setSync("synced");
      }
    } catch {
      setSync("offline");
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, intervalMs);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", refresh);
    };
  }, [refresh, intervalMs]);

  const set = useCallback(
    async (adventure: string, value: number) => {
      let failed = false;
      lastEdit.current = Date.now();
      inFlight.current++;
      setSync("saving");
      setValues((vs) => ({ ...vs, [adventure]: value }));
      try {
        const res = await fetch("/api/despair", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adventure, value }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setSync("synced");
      } catch {
        setSync("offline");
        failed = true;
      } finally {
        inFlight.current--;
        lastEdit.current = failed ? 0 : Date.now();
      }
      if (failed) await refresh();
    },
    [refresh],
  );

  return { values, set, sync };
}
