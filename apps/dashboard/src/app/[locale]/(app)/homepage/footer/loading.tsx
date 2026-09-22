/**
 * The footer screen's loading state: its four column panels and its bottom
 * strip in skeleton surfaces while the settings and the contact page's record
 * are read. It has no words, so it has no language to get wrong; `aria-busy`
 * tells a screen reader the region is not ready yet.
 */
const BLOCK = "rounded-[var(--radius-lg)] bg-[color:var(--color-surface-skeleton)] motion-safe:animate-pulse";

const HomepageFooterLoading = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <div className={`h-20 ${BLOCK}`} />
    <div className="grid gap-6 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={`h-72 ${BLOCK}`} />
      ))}
    </div>
    <div className={`h-40 ${BLOCK}`} />
  </div>
);

export default HomepageFooterLoading;
