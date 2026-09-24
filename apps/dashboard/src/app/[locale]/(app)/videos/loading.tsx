/**
 * The videos screen while its three reads are in flight.
 *
 * The shape of the screen in skeleton surfaces — the banner's place, the
 * filter row, and ten rows at the height a row with a 96×54 still actually
 * has, so nothing jumps when the real table arrives. It has no words, so it
 * has no language to get wrong; `aria-busy` tells a screen reader the region
 * is not ready yet.
 */
const BLOCK = "rounded-[var(--radius-md)] bg-[color:var(--color-surface-skeleton)] motion-safe:animate-pulse";

const VideosLoading = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <div className={`h-24 ${BLOCK}`} />

    <div className="flex flex-wrap items-end gap-3">
      <div className={`h-13 w-56 ${BLOCK}`} />
      <div className={`h-13 min-w-56 flex-1 ${BLOCK}`} />
      <div className={`h-13 w-40 ${BLOCK}`} />
      <div className={`h-13 w-40 ${BLOCK}`} />
    </div>

    <div className="flex flex-col gap-2">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className={`h-[78px] ${BLOCK}`} />
      ))}
    </div>
  </div>
);

export default VideosLoading;
