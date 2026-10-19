/**
 * Page heading block: Droidobesh caption (the title unless an eyebrow is given), title, then lead copy.
 * 8px internal gap, 64px (desktop) / 48px (mobile) space below, per the design spec.
 */
export function PageHeading({
  title,
  eyebrow,
  compact,
  children,
}: {
  title: string;
  /** Droidobesh caption above the title; defaults to repeating the title */
  eyebrow?: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className={compact ? "page-heading compact" : "page-heading"}>
      <p className="eyebrow" aria-hidden="true">{eyebrow ?? title}</p>
      <h1>{title}</h1>
      {children}
    </header>
  );
}
