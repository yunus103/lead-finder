/** Shared route-level loading placeholder so navigation gives instant visual feedback. */
export function PageSkeleton({ blocks = 3, wide = false }: { blocks?: number; wide?: boolean }) {
  return (
    <main
      className={`${wide ? "max-w-7xl" : "max-w-5xl"} mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse`}
      aria-busy="true"
      aria-label="Yükleniyor"
    >
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="h-9 w-2/3 max-w-md rounded-lg bg-slate-200" />
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="h-40 rounded-2xl border border-slate-200/90 bg-white" />
      ))}
    </main>
  );
}
