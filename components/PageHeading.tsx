/**
 * Page heading block: Droidobesh caption (repeats the title exactly), title, then lead copy.
 * 8px internal gap, 64px (desktop) / 48px (mobile) space below, per the design spec.
 */
export function PageHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="page-heading">
      <p className="eyebrow" aria-hidden="true">{title}</p>
      <h1>{title}</h1>
      {children}
    </header>
  );
}
