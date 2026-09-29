export default function HomeLoading() {
  return <main className="workspace-page mx-auto max-w-6xl home-dashboard home-dashboard-loading" aria-label="Loading your CrewLab dashboard" aria-busy="true">
    <div className="home-loading-heading"><span /><span /><span /></div>
    <div className="home-loading-stats">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
    <div className="home-loading-section"><span /><div><span /><span /><span /></div></div>
    <div className="home-loading-columns"><span /><span /></div>
  </main>;
}
