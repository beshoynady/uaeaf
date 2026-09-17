import { AccentRule } from "@/components/ui/accent-rule";

/**
 * A section's heading as the built pages write it (`page-building-guide.md`
 * §2, «نمطا العنوان»): the `h2` with the accent rule, then its sentence at
 * `body-lg` in the secondary tier.
 *
 * The memberships frame highlights one word in green instead. That word would
 * be `--color-brand-primary` as text, which the token contract keeps out of
 * text (4.37:1 on the sunken ground), and a second heading pattern on one page;
 * so the section takes the site's pattern. PENDING FIGMA BACK-SYNC.
 */
export const SectionHeading = ({
  id,
  title,
  subtitle,
  onRegister = false,
  mutedClass = "text-[color:var(--color-text-secondary)]",
}: {
  id: string;
  title: string;
  subtitle: string | null;
  onRegister?: boolean;
  mutedClass?: string;
}) => (
  <div data-reveal="">
    <h2 id={id} data-reveal-part="rise" className="flex items-center gap-4 text-h2 text-balance">
      <AccentRule onRegister={onRegister} />
      <span>{title}</span>
    </h2>
    {subtitle ? (
      <p data-reveal-part="rise" style={{ "--reveal-step": 1 } as React.CSSProperties} className={`mt-2 max-w-[62ch] text-body-lg text-pretty ${mutedClass}`}>
        {subtitle}
      </p>
    ) : null}
  </div>
);
