export default function MyProjectsLoading() {
  return <main className="workspace-page mx-auto max-w-6xl applications-loading" aria-label="Loading your projects" aria-busy="true">
    <div className="applications-loading-heading"><span /><span /><span /></div>
    <div className="applications-loading-grid my-projects-loading-grid">{Array.from({ length: 3 }, (_, index) => <section key={index}><span /><span /><span /></section>)}</div>
  </main>;
}
