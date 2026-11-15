"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeading } from "@/components/PageHeading";
import { CAREER_BLURBS, ORIGIN_BLURBS, SPECIES_BLURBS } from "@/lib/hero/data/blurbs";
import { CAREER_FEATURES, ORIGIN_FEATURES, SPECIES_FEATURES } from "@/lib/hero/data/features";
import { ARCHETYPE_FEATURES, archetypeKey, CAREERS, ORIGINS, PATHS, PATH_BY_ID, SPECIES, SPECIES_BY_ID, CAREER_BY_ID, ORIGIN_BY_ID } from "@/lib/hero/data";
import { describeGrants, oneLine, playerNotes } from "@/lib/hero/describe";
import { careerKey, choiceKey, computeHero, emptyHero, originKey, pathKey, speciesKey, subspeciesKey } from "@/lib/hero/engine";
import { STEPS, type StepKey, stepProblems } from "@/lib/hero/steps";
import { type Hero, SKILLS, STEP_NAMES, TRAIT_NAMES, TRAITS, type Trait } from "@/lib/hero/types";
import { CheckList, ChoiceFields, Gain, RadioList } from "./fields";
import { Ledger } from "./Ledger";

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const ARRAY_VALUES = [2, 1, 0, -1];

const pathMore = (p: (typeof PATHS)[number]) => [
  `Saving roll proficiency: ${p.saves.map((t) => TRAIT_NAMES[t]).join(" and ")}`,
  `Weapon proficiency: ${p.weaponProficiency}`,
  ...(p.casting ? [`${p.casting.kind} (${TRAIT_NAMES[p.casting.trait]} + proficiency)`] : []),
  ...(p.resource.kind === "die" ? [`${p.resource.name}: 1d4`] : p.resource.kind === "fury" ? ["Fury: +2 damage, 2 uses"] : p.resource.kind === "assess" ? ["Assess stances"] : []),
  `Archetypes: ${p.archetypes.filter((a) => !a.locked).map((a) => a.name).join(", ")}`,
];

interface EditMode {
  characterId: string;
  hero: Hero;
}

export function Builder({ playerId, playerName, adventures, edit }: { playerId: string; playerName: string; adventures: readonly string[]; edit?: EditMode }) {
  const router = useRouter();
  const params = useSearchParams();
  // Editing an existing Hero skips the adventure, which the tracker already has
  const steps = useMemo(() => (edit ? STEPS.filter((s) => s.key !== "adventure") : STEPS), [edit]);
  const step: StepKey = steps.find((s) => s.key === params.get("step"))?.key ?? steps[0].key;
  const index = steps.findIndex((s) => s.key === step);

  const storageKey = edit ? `mtfbwy-edit-${edit.characterId}` : `mtfbwy-draft-${playerId}`;
  const [hero, setHero] = useState<Hero>(() => (edit ? { ...emptyHero(), ...edit.hero } : emptyHero()));
  const [saved, setSaved] = useState<string[] | null>(null);
  const [adventure, setAdventure] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // A refresh shouldn't lose the draft, so it lives in this tab's session storage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { hero?: Hero; adventure?: string };
        if (saved.hero) setHero(edit ? { ...emptyHero(), ...saved.hero, startingLevel: edit.hero.startingLevel, levelLog: edit.hero.levelLog, imported: edit.hero.imported } : { ...emptyHero(), ...saved.hero });
        if (typeof saved.adventure === "string") setAdventure(saved.adventure);
      }
    } catch {
      // No storage available: the draft just lives in memory
    }
    setLoaded(true);
  }, [storageKey, edit]);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ hero, adventure }));
    } catch {
      // Ignore
    }
  }, [hero, adventure, loaded, storageKey]);

  // Each step is its own screen: put focus on its heading so a screen reader starts there
  useEffect(() => {
    setShowProblems(false);
    setSaved(null);
    const h1 = document.querySelector("h1");
    h1?.setAttribute("tabindex", "-1");
    h1?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const d = useMemo(() => computeHero(hero), [hero]);
  const problems = stepProblems(hero, step);

  const patch = useCallback((fn: (h: Hero) => Hero) => setHero((h) => fn(h)), []);
  const setChoice = (key: string, v: string | string[]) => patch((h) => ({ ...h, choices: { ...h.choices, [key]: v } }));
  const dropChoices = (h: Hero, ...prefixes: string[]) => Object.fromEntries(Object.entries(h.choices).filter(([k]) => !prefixes.some((p) => k.startsWith(p))));

  const go = (key: StepKey) => router.push(`?step=${key}`);
  const next = (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.length) {
      setShowProblems(true);
      setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    go(steps[Math.min(index + 1, steps.length - 1)].key);
  };

  async function create() {
    setBusy(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/heroes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId, hero, adventure }) });
      if (res.status === 201) {
        const { id } = (await res.json()) as { id: string };
        try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
        router.push(`/c/${id}`);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { issues?: { message: string }[] };
      setSaveError(body.issues?.length ? body.issues.map((i) => i.message).join(". ") : "Couldn’t save your Hero. Try again.");
    } catch {
      setSaveError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/heroes/${edit.characterId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hero }) });
      const body = (await res.json().catch(() => ({}))) as { complete?: boolean; issues?: { message: string }[] };
      if (res.ok) {
        try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
        if (body.complete) {
          router.push(`/c/${edit.characterId}`);
          router.refresh();
          return;
        }
        setSaved((body.issues ?? []).map((i) => i.message));
        return;
      }
      setSaveError(body.issues?.length ? body.issues.map((i) => i.message).join(". ") : "Couldn’t save your Hero. Try again.");
    } catch {
      setSaveError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const species = SPECIES_BY_ID[hero.species.id];
  const sub = species?.subspecies?.find((s) => s.id === hero.species.subspeciesId);
  const origin = ORIGIN_BY_ID[hero.origin.id];
  const path = PATH_BY_ID[hero.path.id];
  const career = CAREER_BY_ID[hero.career.id];
  const archetypeFeature = path && hero.path.archetypeId ? ARCHETYPE_FEATURES[archetypeKey(path.id, hero.path.archetypeId)]?.find((f) => f.level === 1) : undefined;

  const titles: Record<StepKey, string> = {
    adventure: "Choose an adventure",
    species: "Choose a species",
    origin: "Choose an origin",
    path: "Choose a path",
    career: "Choose a career",
    traits: "Assign your traits",
    identity: "Name your Hero",
    review: edit ? "Review and save" : "Review your Hero",
  };
  const lede: Record<StepKey, string> = {
    adventure: "Which story is this Hero part of? You can leave it for now and add it later.",
    species: "Where you come from shapes your body, your senses and your threshold for pain.",
    origin: "What you lived through before the story began.",
    path: "How you fight, and what you believe in. You’ll pick your archetype and two skills.",
    career: "The work that kept you alive. A skill you already have becomes Expertise.",
    traits: "Place the array +2, +1, +1, +0, +0, −1 across your six traits. Everything you’ve chosen so far is added on top.",
    identity: "Who is your Hero?",
    review: edit ? "Check everything, then save. You can save a half-finished Hero and come back to it." : "Check everything, then create your Hero and start tracking.",
  };

  return (
    <>
      <PageHeading title={titles[step]}>
        <p className="lede">{lede[step]}</p>
        <p className="step-count">Step {index + 1} of {steps.length}: {steps[index].label} · {playerName}</p>
      </PageHeading>

      {showProblems && problems.length > 0 && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <strong>There’s something to sort first</strong>
          <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <form onSubmit={next} noValidate className="builder-form">
        {step === "adventure" && (
          <div className="field">
            <label htmlFor="adventure">Adventure</label>
            <select id="adventure" value={adventure} onChange={(e) => setAdventure(e.target.value)}>
              <option value="">None, add later</option>
              {adventures.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}

        {step === "species" && (
          <>
            <RadioList
              legend="Species"
              name="species"
              filterable
              grouped
              value={hero.species.id}
              options={[...SPECIES].sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ id: s.id, label: s.name, hint: oneLine(s), blurb: SPECIES_BLURBS[s.id], features: SPECIES_FEATURES[s.id], more: [`Species damage threshold ${s.threshold}`, ...describeGrants(s.grants), ...playerNotes(s.notes).filter((n) => !SPECIES_FEATURES[s.id]?.some((f) => f.name.toLowerCase() === n.toLowerCase()))] }))}
              onChange={(id) => patch((h) => ({ ...h, species: { id }, choices: dropChoices(h, "species:", "subspecies:") }))}
            />
            {species?.subspecies && (
              <RadioList
                legend={species.subspeciesLabel ?? "Kind"}
                name="subspecies"
                value={hero.species.subspeciesId}
                options={species.subspecies.map((s) => ({ id: s.id, label: s.name, hint: oneLine(s), more: describeGrants(s.grants) }))}
                onChange={(id) => patch((h) => ({ ...h, species: { ...h.species, subspeciesId: id }, choices: dropChoices(h, "subspecies:") }))}
              />
            )}
            {species && <ChoiceFields hero={hero} setChoice={setChoice} sourceKey={speciesKey(species.id)} choices={species.choices} />}
            {species && sub && <ChoiceFields hero={hero} setChoice={setChoice} sourceKey={subspeciesKey(species.id, sub.id)} choices={sub.choices} />}
            {species && <Gain lines={[`Species damage threshold ${species.threshold}`, ...describeGrants([...species.grants, ...(sub?.grants ?? [])]), ...playerNotes(species.notes)]} />}
          </>
        )}

        {step === "origin" && (
          <>
            <RadioList
              legend="Origin"
              name="origin"
              filterable
              grouped
              value={hero.origin.id}
              options={[...ORIGINS].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ id: o.id, label: o.name, hint: oneLine(o), blurb: ORIGIN_BLURBS[o.id], features: ORIGIN_FEATURES[o.id], more: describeGrants(o.grants) }))}
              onChange={(id) => patch((h) => ({ ...h, origin: { id }, choices: dropChoices(h, "origin:") }))}
            />
            {origin && <ChoiceFields hero={hero} setChoice={setChoice} sourceKey={originKey(origin.id)} choices={origin.choices} />}
            {origin && <Gain lines={[...describeGrants(origin.grants)]} />}
          </>
        )}

        {step === "path" && (
          <>
            <RadioList
              legend="Path"
              name="path"
              value={hero.path.id}
              options={PATHS.map((p) => ({ id: p.id, label: p.name, hint: `${p.traits.map((t) => TRAIT_NAMES[t]).join(" and ")} · ${p.casting?.kind ?? (p.resource.kind === "fury" ? "Fury" : "")}`.replace(/ · $/, ""), more: pathMore(p) }))}
              onChange={(id) => patch((h) => ({ ...h, path: { id, archetypeId: "" }, choices: dropChoices(h, "path:") }))}
            />
            {path && (
              <>
                <RadioList
                  legend="Archetype"
                  name="archetype"
                  value={hero.path.archetypeId}
                  options={path.archetypes.filter((a) => !a.locked).map((a) => ({ id: a.id, label: a.name }))}
                  onChange={(id) => patch((h) => ({ ...h, path: { ...h.path, archetypeId: id } }))}
                />
                <CheckList
                  legend="Two skills"
                  name="path-skills"
                  n={2}
                  options={path.skillOptions.map((s) => ({ id: s, label: s, hint: SKILLS.find((x) => x.name === s)?.trait }))}
                  value={Array.isArray(hero.choices[choiceKey(pathKey(path.id), "skills")]) ? (hero.choices[choiceKey(pathKey(path.id), "skills")] as string[]) : []}
                  onChange={(ids) => setChoice(choiceKey(pathKey(path.id), "skills"), ids)}
                />
                <Gain
                  lines={[
                    `Saving roll proficiency: ${path.saves.map((t) => TRAIT_NAMES[t]).join(" and ")}`,
                    `Weapon proficiency: ${path.weaponProficiency}`,
                    ...(path.casting ? [`${path.casting.kind} (${TRAIT_NAMES[path.casting.trait]} + proficiency)`] : []),
                    ...(path.basicPowers ? [`Basic ${path.basicPowers === "force" ? "Force" : path.basicPowers === "magick" ? "Magick" : "Tech"} powers`] : []),
                    ...(path.resource.kind === "die" ? [`${path.resource.name}: 1d4`] : path.resource.kind === "fury" ? ["Fury: +2 damage, 2 uses"] : path.resource.kind === "assess" ? ["Assess stances"] : []),
                    ...(path.minorThresholdBonus ? [`Minor damage threshold +${path.minorThresholdBonus}`] : []),
                    ...(archetypeFeature ? [`First feature: ${archetypeFeature.name}`] : []),
                  ]}
                />
                {archetypeFeature && (
                  <details className="read-more">
                    <summary>Read {archetypeFeature.name}</summary>
                    <p>{archetypeFeature.text}</p>
                  </details>
                )}
              </>
            )}
          </>
        )}

        {step === "career" && (
          <>
            <RadioList
              legend="Career"
              name="career"
              filterable
              grouped
              value={hero.career.id}
              options={[...CAREERS].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ id: c.id, label: c.name, hint: [c.grants.find((g) => g.type === "skill_proficiency" && true) ? describeGrants(c.grants.filter((g) => g.type === "skill_proficiency")).join(", ").replace("Proficient in ", "") : "", c.tool].filter(Boolean).join(" · "), blurb: CAREER_BLURBS[c.id], features: CAREER_FEATURES[c.id], more: [...describeGrants(c.grants), `Tool proficiency: ${c.tool}`, `Starting equipment: ${c.equipment}`, ...c.fixedKit, `${c.pack} pack`, ...(c.notes ? [c.notes] : [])] }))}
              onChange={(id) => patch((h) => ({ ...h, career: { id }, choices: dropChoices(h, "career:") }))}
            />
            {career && <ChoiceFields hero={hero} setChoice={setChoice} sourceKey={careerKey(career.id)} choices={career.choices} />}
            {career && (
              <Gain
                lines={[
                  ...describeGrants(career.grants),
                  `Tool proficiency: ${career.tool}`,
                  `Starting equipment: ${career.equipment}`,
                  ...career.fixedKit,
                  `${career.pack} pack`,
                  ...(career.notes ? [career.notes] : []),
                ]}
              />
            )}
            {career && d.skills.some((s) => s.sources.includes(career.name) && s.step === 3) && (
              <p className="note">You already have {d.skills.filter((s) => s.sources.includes(career.name) && s.step === 3).map((s) => s.skill).join(", ")}, so {career.name} makes it Expertise.</p>
            )}
          </>
        )}

        {step === "traits" && <TraitStep hero={hero} d={d} setHero={setHero} />}

        {step === "identity" && (
          <>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" value={hero.identity.name} maxLength={80} onChange={(e) => patch((h) => ({ ...h, identity: { ...h.identity, name: e.target.value } }))} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="languages">Languages</label>
              <input id="languages" value={hero.identity.languages} onChange={(e) => patch((h) => ({ ...h, identity: { ...h.identity, languages: e.target.value } }))} />
            </div>
            <div className="field">
              <label htmlFor="backstory">Backstory</label>
              <textarea id="backstory" rows={6} value={hero.identity.backstory} onChange={(e) => patch((h) => ({ ...h, identity: { ...h.identity, backstory: e.target.value } }))} />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" rows={3} value={hero.identity.notes} onChange={(e) => patch((h) => ({ ...h, identity: { ...h.identity, notes: e.target.value } }))} />
            </div>
          </>
        )}

        {step === "review" && <Review hero={hero} d={d} adventure={adventure} editing={!!edit} />}

        {saveError && <p className="err-text" role="alert">{saveError}</p>}
        {saved && (
          <div className="note" role="status">
            <strong>Saved.</strong> {saved.length ? "Still to sort before this Hero is complete:" : ""}
            <ul>{saved.map((m, n) => <li key={n}>{m}</li>)}</ul>
          </div>
        )}

        <div className="step-nav">
          {index > 0 ? <button type="button" className="btn quiet" onClick={() => go(steps[index - 1].key)}>Back</button> : <span />}
          {step === "review" && edit ? (
            <button type="button" className="btn" disabled={busy || !hero.identity.name.trim()} onClick={saveEdit}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          ) : step === "review" ? (
            <button type="button" className="btn" disabled={busy || d.issues.length > 0 || !hero.identity.name.trim()} onClick={create}>
              {busy ? "Creating…" : "Create Hero"}
            </button>
          ) : (
            <button type="submit" className="btn">Continue</button>
          )}
        </div>
      </form>

      {step !== "review" && <Ledger d={d} />}

      <p className="section"><Link className="standalone" href={edit ? `/c/${edit.characterId}` : `/p/${playerId}`}>{edit ? "Back to the tracker" : "Back to characters"}</Link></p>
    </>
  );
}

function TraitStep({ hero, d, setHero }: { hero: Hero; d: ReturnType<typeof computeHero>; setHero: (fn: (h: Hero) => Hero) => void }) {
  const placed = TRAITS.map((t) => hero.traitArray[t]);
  const left = [2, 1, 1, 0, 0, -1].slice();
  for (const v of placed) {
    const i = left.indexOf(v);
    if (i >= 0) left.splice(i, 1);
  }
  const bonus = (t: Trait) => d.traitLedger[t].filter((r) => r.source !== "Starting array").reduce((n, r) => n + r.amount, 0);
  return (
    <>
      <p className="note" aria-live="polite">To place: {left.length ? left.map(sign).join(", ") : "nothing, all placed"}</p>
      <div className="trait-grid">
        {TRAITS.map((t) => (
          <div className="trait-row" key={t}>
            <label htmlFor={`trait-${t}`}>{TRAIT_NAMES[t]} <span className="abbr">({t})</span></label>
            <select id={`trait-${t}`} value={hero.traitArray[t]} onChange={(e) => setHero((h) => ({ ...h, traitArray: { ...h.traitArray, [t]: Number(e.target.value) } }))}>
              {ARRAY_VALUES.map((v) => <option key={v} value={v}>{sign(v)}</option>)}
            </select>
            <span className="trait-bonus">{bonus(t) ? `${sign(bonus(t))} from your choices` : "no bonuses"}</span>
            <strong className="trait-total" aria-label={`${TRAIT_NAMES[t]} total ${sign(d.traits[t])}`}>{sign(d.traits[t])}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

function Review({ hero, d, adventure, editing }: { hero: Hero; d: ReturnType<typeof computeHero>; adventure: string; editing: boolean }) {
  const species = SPECIES_BY_ID[hero.species.id];
  const sub = species?.subspecies?.find((s) => s.id === hero.species.subspeciesId);
  const path = PATH_BY_ID[hero.path.id];
  const arch = path?.archetypes.find((a) => a.id === hero.path.archetypeId);
  return (
    <>
      <p className="review-line">
        <strong>{hero.identity.name || "Unnamed Hero"}</strong>: {[sub ? `${species?.name} (${sub.name})` : species?.name, ORIGIN_BY_ID[hero.origin.id]?.name, `${path?.name} (${arch?.name} 1)`, CAREER_BY_ID[hero.career.id]?.name].filter(Boolean).join(" • ")}
      </p>
      {!editing && <p className="note">Adventure: {adventure || "None yet, add later"}</p>}
      {d.issues.length > 0 && (
        <div className="error-summary" role="alert">
          <strong>{editing ? "Still to sort" : "Not ready yet"}</strong>
          <ul>{d.issues.map((i, n) => <li key={n}>{i.message}</li>)}</ul>
        </div>
      )}
      <Ledger d={d} />
      <section className="track">
        <h2>Saving rolls</h2>
        <ul className="plain-list">{d.saves.map((s) => <li key={s.trait}>{TRAIT_NAMES[s.trait]} {sign(s.modifier)}{s.proficient ? " (proficient)" : ""}</li>)}</ul>
      </section>
      <section className="track">
        <h2>Skills</h2>
        <ul className="plain-list">
          {d.skills.filter((s) => s.step > 0).map((s) => <li key={s.skill}>{s.skill} {sign(s.modifier)} · {STEP_NAMES[s.step]}</li>)}
        </ul>
      </section>
      <section className="track">
        <h2>Powers and features</h2>
        <ul className="plain-list">
          {d.casting.map((c) => <li key={c.kind}>{c.kind} {sign(c.modifier)}</li>)}
          {d.powers.traditions.map((t) => <li key={t}>Basic {t === "force" ? "Force" : t === "magick" ? "Magick" : "Tech"} powers</li>)}
          {d.powers.extraTier0Force > 0 && <li>{d.powers.extraTier0Force} extra Tier 0 Force power{d.powers.extraTier0Force === 1 ? "" : "s"} to choose</li>}
          {d.resources.map((r) => <li key={r.pathId}>{r.text}</li>)}
          {d.features.map((f, i) => <li key={i}>{f.name} <span className="muted">({f.source})</span></li>)}
        </ul>
      </section>
      <p className="note">{editing ? "Equipment, cards and level-ups come next." : "Equipment and cards come next. Your Hero starts at level 1 with no armour."}</p>
    </>
  );
}
