/**
 * A hero heading followed by the tricolour dash, as both album heroes draw it.
 *
 * `PageHero` takes the heading as a node and draws no dash; the approved
 * canvases put one at the end of the heading's last line. It is the kit's own
 * `brand-tricolor-divider` rule rather than a second drawing of the mark, on a
 * `span` because the heading is phrasing content and `TricolorDivider` renders
 * a `div`. Inline, so on a heading that wraps it follows the last line rather
 * than centring on the block. `mb-3` balances the rule's own top margin, which
 * would otherwise sit it below the middle of the line.
 */
export const HeroTitle = ({ children }: { children: string }) => (
  <>
    {children}
    <span
      aria-hidden="true"
      className="brand-tricolor-divider ms-4 mb-3 inline-block align-middle"
    />
  </>
);
