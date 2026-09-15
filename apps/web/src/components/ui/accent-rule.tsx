/**
 * The accent rule (ADR-0072 D3): a short dash on the reading-start side of a
 * label or a heading, in the accent colour.
 *
 * Decorative, so out of the accessibility tree; measured as a shape on the
 * three page grounds (`--color-border-accent`, 3:1). On a coloured register the
 * accent green would vanish into the band, so it takes the band's own text
 * colour instead.
 */
export const AccentRule = ({ onRegister = false }: { onRegister?: boolean }) => (
  <span
    aria-hidden="true"
    data-accent-rule=""
    className={`inline-block h-[var(--border-width-thick)] w-6 shrink-0 ${
      onRegister ? "bg-current" : "bg-[color:var(--color-border-accent)]"
    }`}
  />
);
