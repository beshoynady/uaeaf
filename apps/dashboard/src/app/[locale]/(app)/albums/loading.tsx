/**
 * The albums screens while their reads are in flight.
 *
 * The list's shape in skeleton surfaces — the filter row and ten rows at the
 * height a row with a 64px cover actually has — so nothing jumps when the
 * table arrives. No words, so no language to get wrong; `aria-busy` tells a
 * screen reader the region is not ready. Static: the album screens carry no
 * motion (the dashboard's Operational dose).
 */
const BLOCK = "rounded-[var(--radius-md)] bg-[color:var(--color-surface-skeleton)]";

const AlbumsLoading = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <div className="flex flex-wrap items-end gap-3">
      <div className={`h-13 min-w-56 flex-1 ${BLOCK}`} />
      <div className={`h-13 w-40 ${BLOCK}`} />
      <div className={`h-13 w-40 ${BLOCK}`} />
      <div className={`h-13 w-48 ${BLOCK}`} />
    </div>

    <div className="flex flex-col gap-2">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className={`h-[88px] ${BLOCK}`} />
      ))}
    </div>
  </div>
);

export default AlbumsLoading;
