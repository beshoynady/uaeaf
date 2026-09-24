/**
 * The shape of content that has not arrived.
 *
 * -- Why a shape and not a spinner ------------------------------------------
 *
 * A spinner says "something is happening"; a skeleton says "a table of six
 * rows is happening", and the page does not jump when the rows land because
 * the space was already the right size. That only holds if callers build the
 * skeleton out of the same geometry as the real thing — a skeleton that is a
 * different height is a layout shift with extra steps.
 *
 * -- Announced once, by the region, not by each bar -------------------------
 *
 * Every bar is `aria-hidden`. The container a caller puts them in carries
 * `role="status"` and one sentence; forty announced grey rectangles is not
 * more information than "loading videos", it is less.
 */
export const Skeleton = ({
  className = "",
  rounded = "sm",
}: {
  className?: string;
  rounded?: "sm" | "md" | "full";
}) => (
  <span
    aria-hidden="true"
    className={`block animate-pulse bg-[color:var(--color-surface-sunken)] motion-reduce:animate-none ${
      rounded === "full"
        ? "rounded-[var(--radius-full)]"
        : rounded === "md"
          ? "rounded-[var(--radius-md)]"
          : "rounded-[var(--radius-sm)]"
    } ${className}`}
  />
);

/**
 * A loading region: the shapes, plus the one sentence that is actually
 * announced.
 *
 * `aria-busy` so assistive technology can tell this is a placeholder rather
 * than a page that has finished and happens to be empty — which is the other
 * thing a screen of grey bars could mean.
 */
export const SkeletonRegion = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);
