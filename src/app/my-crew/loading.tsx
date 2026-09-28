export default function LoadingMyCrew() {
  return <main className="workspace-main min-h-screen px-5 py-10 sm:px-8 lg:px-12" aria-label="Loading your crew"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-3 w-36 rounded bg-black/10" /><div className="mt-5 h-12 max-w-sm rounded bg-black/10" /><div className="mt-4 h-5 max-w-md rounded bg-black/5" /><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-56 rounded-2xl border border-black/10 bg-white/50" />)}</div></div></main>;
}
