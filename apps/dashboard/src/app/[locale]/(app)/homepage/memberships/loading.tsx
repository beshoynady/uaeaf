/**
 * The hero screen's loading state: the shape of the screen in skeleton
 * surfaces while the homepage, its slides and the library are read. It has no
 * words, so it has no language to get wrong; `aria-busy` tells a screen reader
 * the region is not ready yet.
 */
const BLOCK = "rounded-[var(--radius-lg)] bg-[color:var(--color-surface-skeleton)] motion-safe:animate-pulse";

const HomepageHeroLoading = () => {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className={`h-20 ${BLOCK}`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={`h-56 ${BLOCK}`} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`h-96 ${BLOCK}`} />
        <div className={`h-96 ${BLOCK}`} />
      </div>
    </div>
  );
};

export default HomepageHeroLoading;
