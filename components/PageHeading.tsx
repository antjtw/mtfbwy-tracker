/** Page title with the Droidobesh caption above it repeating the exact same text, as in the Figma. */
export function PageHeading({ children }: { children: string }) {
  return (
    <>
      <p className="eyebrow" aria-hidden="true">{children}</p>
      <h1>{children}</h1>
    </>
  );
}
