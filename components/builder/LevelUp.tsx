"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeading } from "@/components/PageHeading";
import { cardOptions, cardProblems } from "@/lib/hero/cardEligibility";
import { computeHero, TRAIT_CAP } from "@/lib/hero/engine";
import { changesBetween, entryComplete, entryProblems, levelInfo, tierFor } from "@/lib/hero/levelup";
import { type Card, type Hero, type LevelEntry, type ProgressionOptionId, type ProgressionPick, SKILLS, TRAIT_NAMES, TRAITS, type Trait } from "@/lib/hero/types";
import { RadioList } from "./fields";
import { PATH_BY_ID } from "@/lib/hero/data";

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const STEP_LABELS = { gain: "Advance", picks: "Options", card: "Card", review: "Review" } as const;
type StepKey = keyof typeof STEP_LABELS;

interface Slot {
  optionId: ProgressionOptionId | "";
  trait?: Trait;
  skill?: string;
  text?: string;
}
interface Draft {
  gain: string; // "adv:path/arch" | "diversify" | "multi_path"
  divTarget: string; // "path/arch"
  multiPath: string;
  multiArch: string;
  slots: [Slot, Slot];
  cardId: string;
}
const blank = (): Draft => ({ gain: "", divTarget: "", multiPath: "", multiArch: "", slots: [{ optionId: "" }, { optionId: "" }], cardId: "" });

export function LevelUp({ characterId, characterName, hero, level, cards }: { characterId: string; characterName: string; hero: Hero; level: number; cards: Card[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const info = useMemo(() => levelInfo(hero, level)!, [hero, level]);
  const picksDone = !!info.existing && entryComplete(info.existing);

  const storageKey = `mtfbwy-level-${characterId}-${level}`;
  const [draft, setDraft] = useState<Draft>(blank);
  const [loaded, setLoaded] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState<{ complete: boolean; characterLevel: number } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) setDraft({ ...blank(), ...(JSON.parse(raw) as Draft) });
    } catch {
      // Draft just lives in memory
    }
    setLoaded(true);
  }, [storageKey]);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Ignore
    }
  }, [draft, loaded, storageKey]);
  const baseDerived = useMemo(() => computeHero(info.base), [info.base]);
  const status = (id: ProgressionOptionId) => info.options.find((o) => o.option.id === id);
  const branching = draft.gain === "diversify" || draft.gain === "multi_path";

  // The entry this draft describes
  const entry: LevelEntry | null = useMemo(() => {
    const fixed = info.existing && info.gainFixed ? info.existing : null;
    const picksFromSlots = () => {
      const out: ProgressionPick[] = [];
      for (const s of draft.slots) {
        if (!s.optionId) continue;
        const st = status(s.optionId);
        if (!st) continue;
        const tier = tierFor(st, out) ?? undefined;
        out.push({ optionId: s.optionId, tier, ...(s.trait ? { trait: s.trait } : {}), ...(s.skill ? { skill: s.skill as never } : {}), ...(s.text ? { text: s.text } : {}) });
      }
      return out;
    };
    if (fixed && picksDone) return { ...fixed, ...(draft.cardId ? { cardId: draft.cardId } : { cardId: undefined }) };
    if (fixed) return { characterLevel: level, pathId: fixed.pathId, archetypeId: fixed.archetypeId, picks: picksFromSlots(), ...(draft.cardId ? { cardId: draft.cardId } : {}) };
    if (draft.gain === "diversify") {
      const [pathId, archetypeId] = draft.divTarget.split("/");
      const st = status("diversify");
      return { characterLevel: level, pathId: pathId ?? "", archetypeId: archetypeId ?? "", picks: [{ optionId: "diversify", tier: st ? tierFor(st, []) ?? undefined : undefined }], ...(draft.cardId ? { cardId: draft.cardId } : {}) };
    }
    if (draft.gain === "multi_path") {
      const st = status("multi_path");
      return { characterLevel: level, pathId: "", archetypeId: "", picks: [{ optionId: "multi_path", pathId: draft.multiPath, archetypeId: draft.multiArch, tier: st ? tierFor(st, []) ?? undefined : undefined }], ...(draft.cardId ? { cardId: draft.cardId } : {}) };
    }
    if (draft.gain.startsWith("adv:")) {
      const [pathId, archetypeId] = draft.gain.slice(4).split("/");
      return { characterLevel: level, pathId, archetypeId, picks: picksFromSlots(), ...(draft.cardId ? { cardId: draft.cardId } : {}) };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, info, level]);

  // Whether this level earns a card depends on which archetype gains it
  const cardInfo = useMemo(() => (entry ? cardOptions(info.base, entry, cards) : { due: null, options: [] }), [entry, info.base, cards]);
  const cardStep = !entry || !!cardInfo.due;
  const steps: StepKey[] = [...(info.gainFixed ? [] : ["gain" as const]), ...(picksDone ? [] : ["picks" as const]), ...(cardStep ? ["card" as const] : []), "review"];
  const step: StepKey = steps.find((s) => s === params.get("step")) ?? steps[0];
  const index = steps.indexOf(step);

  useEffect(() => {
    setShowProblems(false);
    const h1 = document.querySelector("h1");
    h1?.setAttribute("tabindex", "-1");
    h1?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const problems: string[] = (() => {
    if (!entry) return ["Choose how you advance"];
    if (step === "gain") {
      if (draft.gain === "diversify" && !draft.divTarget) return ["Choose the new archetype"];
      if (draft.gain === "multi_path" && (!draft.multiPath || !draft.multiArch)) return ["Choose the new path and its archetype"];
      return [];
    }
    if (step === "card") return cardProblems(info.base, entry, cards);
    // The options step only asks about the options; the card comes on its own step
    if (step === "picks") return entryProblems(info.base, entry);
    return [...entryProblems(info.base, entry), ...cardProblems(info.base, entry, cards)];
  })();

  const withEntry = useMemo(() => (entry ? computeHero({ ...info.base, levelLog: [...info.base.levelLog, entry] }) : null), [entry, info.base]);

  const go = (key: StepKey) => router.push(`?level=${level}&step=${key}`);
  const next = (e: React.FormEvent) => {
    e.preventDefault();
    // The picks step only asks for picks when you're advancing an archetype
    const blocked = step === "gain" || step === "card" ? problems : step === "picks" && !branching ? problems : [];
    if (blocked.length) {
      setShowProblems(true);
      setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    go(steps[Math.min(index + 1, steps.length - 1)]);
  };

  async function save() {
    if (!entry) return;
    setBusy(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/heroes/${characterId}/levels`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level, entry }) });
      const body = (await res.json().catch(() => ({}))) as { complete?: boolean; characterLevel?: number; issues?: { message: string }[]; error?: string };
      if (res.ok) {
        try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
        setDone({ complete: !!body.complete, characterLevel: body.characterLevel ?? level });
        return;
      }
      setSaveError(body.issues?.length ? body.issues.map((i) => i.message).join(". ") : body.error === "already_done" ? "That level is already done." : "Couldn’t save the level. Try again.");
    } catch {
      setSaveError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <PageHeading title={`Level ${level} done`}>
          <p className="lede">{characterName} is level {done.characterLevel}.{done.complete ? " The tracker has their new slots." : " Some earlier choices are still open, so the tracker keeps its current slots until they’re filled in."}</p>
        </PageHeading>
        <div className="step-nav">
          <Link className="btn quiet" href={`/c/${characterId}`}>Back to the tracker</Link>
          <a className="btn" href={`/c/${characterId}/level-up`}>Next level</a>
        </div>
      </>
    );
  }

  const gainOptions = [
    ...info.followed.map((f) => ({
      id: `adv:${f.pathId}/${f.archetypeId}`,
      label: `${f.archetypeName} (${f.pathName})`,
      blurb: `Level ${f.level} to ${f.level + 1}`,
    })),
    ...(status("diversify")?.available ? [{ id: "diversify", label: "Diversify", blurb: "Take up a second archetype in a path you follow. This uses both of your options." }] : []),
    ...(status("multi_path")?.available ? [{ id: "multi_path", label: "Multi-path", blurb: "Begin a new path. This uses both of your options." }] : []),
  ];
  const diversifyOptions = info.diversify.flatMap((p) => p.archetypes.map((a) => ({ id: `${p.pathId}/${a.id}`, label: `${a.name} (${p.pathName})` })));
  const multiPathDef = PATH_BY_ID[draft.multiPath];

  const setSlot = (i: 0 | 1, patch: Partial<Slot>) => setDraft((d) => ({ ...d, slots: d.slots.map((s, n) => (n === i ? { ...s, ...patch } : s)) as [Slot, Slot] }));
  const slotChoices = (i: 0 | 1) => {
    const other = draft.slots[i === 0 ? 1 : 0];
    const otherPick: ProgressionPick[] = other.optionId ? [{ optionId: other.optionId, tier: status(other.optionId) ? tierFor(status(other.optionId)!, []) ?? undefined : undefined }] : [];
    return info.options.filter((o) => o.option.id !== "diversify" && o.option.id !== "multi_path" && o.available && (o.option.id === draft.slots[i].optionId || tierFor(o, otherPick) !== null));
  };

  return (
    <>
      <PageHeading title={step === "gain" ? `Level ${level}: how do you advance?` : step === "picks" ? `Level ${level}: choose two options` : step === "card" ? `Level ${level}: choose a card` : `Level ${level}: review`}>
        <p className="lede">
          {step === "gain" && "Pick the archetype that gains this level, or branch out."}
          {step === "picks" && (branching ? "Branching uses both of your options, so there’s nothing more to choose." : "Each level gives two options from your path’s progression table.")}
          {step === "card" && "Each qualifying archetype level gives one card, from that archetype or its path. Locked cards stay visible with what they need."}
          {step === "review" && "This is what changes. Nothing is saved until you confirm."}
        </p>
        <p className="step-count">Step {index + 1} of {steps.length}: {STEP_LABELS[step]} · {characterName}</p>
      </PageHeading>

      {showProblems && problems.length > 0 && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <strong>There’s something to sort first</strong>
          <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <form onSubmit={next} noValidate className="builder-form">
        {step === "gain" && (
          <>
            <RadioList legend="Advance" name="gain" value={draft.gain} options={gainOptions} onChange={(id) => setDraft((d) => ({ ...d, gain: id }))} />
            {draft.gain === "diversify" && <RadioList legend="New archetype" name="div" value={draft.divTarget} options={diversifyOptions} onChange={(id) => setDraft((d) => ({ ...d, divTarget: id }))} />}
            {draft.gain === "multi_path" && (
              <>
                <RadioList
                  legend="New path"
                  name="multi"
                  value={draft.multiPath}
                  options={info.multiPath.map((c) => ({ id: c.path.id, label: c.path.name, hint: c.path.traits.map((t) => TRAIT_NAMES[t]).join(" and "), disabled: !c.eligible, reason: c.reason }))}
                  onChange={(id) => setDraft((d) => ({ ...d, multiPath: id, multiArch: "" }))}
                />
                {multiPathDef && (
                  <RadioList legend="Archetype" name="multi-arch" value={draft.multiArch} options={multiPathDef.archetypes.filter((a) => !a.locked).map((a) => ({ id: a.id, label: a.name }))} onChange={(id) => setDraft((d) => ({ ...d, multiArch: id }))} />
                )}
              </>
            )}
          </>
        )}

        {step === "picks" && (
          branching ? (
            <p className="note">{draft.gain === "diversify" ? "Diversify" : "Multi-path"} takes both options this level.</p>
          ) : (
            <>
              {info.gainFixed && info.existing && (
                <p className="note">
                  This level went to {(() => { const f = info.followed.find((x) => x.pathId === info.existing!.pathId && x.archetypeId === info.existing!.archetypeId); return f ? `${f.archetypeName} (${f.pathName})` : "your archetype"; })()}. Only the options are missing.
                </p>
              )}
              {([0, 1] as const).map((i) => {
                const s = draft.slots[i];
                const st = s.optionId ? status(s.optionId) : undefined;
                return (
                  <fieldset className="choice-set level-slot" key={i}>
                    <legend>Option {i + 1}</legend>
                    <div className="field">
                      <label htmlFor={`opt-${i}`}>What do you take?</label>
                      <select id={`opt-${i}`} value={s.optionId} onChange={(e) => setSlot(i, { optionId: e.target.value as ProgressionOptionId | "", trait: undefined, skill: undefined, text: undefined })}>
                        <option value="">Choose an option</option>
                        {slotChoices(i).map((o) => <option key={o.option.id} value={o.option.id}>{o.option.label}</option>)}
                      </select>
                    </div>
                    {s.optionId === "trait" && (
                      <div className="field">
                        <label htmlFor={`trait-${i}`}>Which trait?</label>
                        <select id={`trait-${i}`} value={s.trait ?? ""} onChange={(e) => setSlot(i, { trait: (e.target.value || undefined) as Trait | undefined })}>
                          <option value="">Choose a trait</option>
                          {TRAITS.map((t) => <option key={t} value={t} disabled={baseDerived.traits[t] >= TRAIT_CAP}>{TRAIT_NAMES[t]} ({t}) {sign(baseDerived.traits[t])}{baseDerived.traits[t] >= TRAIT_CAP ? ", at the cap" : ""}</option>)}
                        </select>
                      </div>
                    )}
                    {s.optionId === "skill_tier" && (
                      <div className="field">
                        <label htmlFor={`skill-${i}`}>Which skill?</label>
                        <select id={`skill-${i}`} value={s.skill ?? ""} onChange={(e) => setSlot(i, { skill: e.target.value || undefined })}>
                          <option value="">Choose a skill</option>
                          {SKILLS.map(({ name }) => {
                            const cur = baseDerived.skills.find((x) => x.skill === name)!;
                            return <option key={name} value={name} disabled={cur.step >= 3}>{name} ({["untrained", "trained", "proficient", "expertise"][cur.step]})</option>;
                          })}
                        </select>
                      </div>
                    )}
                    {s.optionId === "weapon_proficiency" && (
                      <div className="field">
                        <label htmlFor={`weapon-${i}`}>Which weapon?</label>
                        <input id={`weapon-${i}`} value={s.text ?? ""} maxLength={80} onChange={(e) => setSlot(i, { text: e.target.value })} autoComplete="off" />
                      </div>
                    )}
                    {st && st.remaining.length > 0 && <p className="choice-hint">{st.remaining.map((r) => `Tier ${r.tier}: ${r.uses} left`).join(" · ")}</p>}
                  </fieldset>
                );
              })}
            </>
          )
        )}

        {step === "card" && (
          <RadioList
            legend="Card"
            name="card"
            filterable
            filterHint="Name, or a word from the card"
            grouped
            groupBy={(o) => o.hint?.split(" · ")[0] ?? ""}
            value={draft.cardId}
            options={cardInfo.options.map(({ card, eligible, reason }) => ({
              id: card.id,
              label: card.name,
              hint: [`Tier ${card.tier}`, card.willpowerCostText ? `Willpower ${card.willpowerCostText}` : "", card.actionRoll === "Yes" ? "Action roll" : "", card.archetype || "Path card"].filter(Boolean).join(" · "),
              blurb: card.content.split(/(?<=[.!?])\s/)[0],
              text: card.content + (card.prerequisiteText ? `\nNeeds: ${card.prerequisiteText}` : ""),
              disabled: !eligible,
              reason,
            }))}
            onChange={(id) => setDraft((d) => ({ ...d, cardId: id }))}
          />
        )}

        {step === "review" && entry && withEntry && (
          <>
            {problems.length > 0 && (
              <div className="error-summary" role="alert">
                <strong>Not ready yet</strong>
                <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
            <section className="track">
              <h2>What changes</h2>
              <ul className="plain-list">
                {changesBetween(baseDerived, withEntry).map((c, i) => (
                  <li key={i}>{c.label}: {c.from ? `${c.from} to ` : ""}<strong>{c.to}</strong></li>
                ))}
              </ul>
            </section>
            {entry.cardId && <p className="note">New card: <strong>{cards.find((c) => c.id === entry.cardId)?.name}</strong></p>}
          </>
        )}

        {saveError && <p className="err-text" role="alert">{saveError}</p>}

        <div className="step-nav">
          {index > 0 ? <button type="button" className="btn quiet" onClick={() => go(steps[index - 1])}>Back</button> : <span />}
          {step === "review" ? (
            <button type="button" className="btn" disabled={busy || problems.length > 0} onClick={save}>{busy ? "Saving…" : `Confirm level ${level}`}</button>
          ) : (
            <button type="submit" className="btn">Continue</button>
          )}
        </div>
      </form>

      <p className="section"><Link className="standalone" href={`/c/${characterId}`}>Back to the tracker</Link></p>
    </>
  );
}
