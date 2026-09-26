/**
 * The photo-gallery section screen while its reads are in flight: the header
 * row and the three settings cards, in skeleton surfaces, static.
 */
const BLOCK = "rounded-[var(--radius-lg)] bg-[color:var(--color-surface-skeleton)]";

const HomepageAlbumsLoading = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <div className={`h-16 ${BLOCK}`} />
    <div className={`h-24 ${BLOCK}`} />
    <div className={`h-72 ${BLOCK}`} />
    <div className={`h-64 ${BLOCK}`} />
  </div>
);

export default HomepageAlbumsLoading;
