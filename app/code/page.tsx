"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CodeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const admin = params.get("admin") === "1";
  const rawNext = params.get("next") ?? "/";
  // Only allow same-site relative redirects
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<"empty" | "wrong" | "network" | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError("empty");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, admin }),
      });
      if (res.ok) return router.replace(next);
      setError(res.status === 401 ? "wrong" : "network");
    } catch {
      setError("network");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="col">
        {(error === "wrong" || error === "network") && (
          <div className="banner" role="alert">
            <div>
              <strong>{error === "wrong" ? "Do or do not, there is no try" : "Lost in hyperspace"}</strong>
              {error === "wrong"
                ? "The code you entered is incorrect. Please try again or message the Games Master for a new one."
                : "Couldn’t reach the server. Check your connection and try again."}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => setError(null)}>×</button>
          </div>
        )}
        <p className="eyebrow">{admin ? "GM access" : "Enter your code"}</p>
        <h1>Enter code</h1>
        <p className="lede">{admin ? "GM code required." : "Welcome back to a galaxy far, far away…."}</p>
        <p className="sub">Need a code? Message the GM.</p>

        <form onSubmit={submit} noValidate className="section stack">
          <div className={`field ${error === "empty" ? "error" : ""}`}>
            <label htmlFor="code">Code</label>
            <input
              id="code"
              name="code"
              type={show ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error === "empty") setError(null);
              }}
              aria-invalid={error === "empty"}
            />
            {error === "empty" && <div className="err">You must enter a code</div>}
          </div>
          <label className="switch">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Show code
          </label>
          <div className="section">
            <button className="btn" type="submit" disabled={busy}>{busy ? "Checking…" : "Continue"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CodePage() {
  return (
    <Suspense>
      <CodeForm />
    </Suspense>
  );
}
