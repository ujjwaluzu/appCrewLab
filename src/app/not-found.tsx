import Link from "next/link";

import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <header className="not-found-header">
        <Brand />
        <span className="not-found-status">Error code <strong>404</strong></span>
      </header>

      <section className="not-found-content" aria-labelledby="not-found-title">
        <div className="not-found-art" aria-hidden="true">
          <span className="not-found-art-grid" />
          <span className="not-found-art-orbit not-found-art-orbit-one" />
          <span className="not-found-art-orbit not-found-art-orbit-two" />
          <span className="not-found-art-node not-found-art-node-one" />
          <span className="not-found-art-node not-found-art-node-two" />
          <span className="not-found-art-cross">+</span>
          <span className="not-found-number">404</span>
          <span className="not-found-art-caption">SIGNAL LOST · SECTOR 04</span>
        </div>

        <div className="not-found-copy">
          <p className="workspace-eyebrow"><span className="not-found-live-dot" /> Off the map</p>
          <h1 id="not-found-title">Looks like this<br />crew went <em>off course.</em></h1>
          <p className="not-found-description">We couldn&apos;t find the page you were looking for. Let&apos;s get you back to building with good company.</p>
          <div className="not-found-actions">
            <Link href="/projects" className="primary-button">
              Explore projects <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/home" className="not-found-home-link">Back to your workspace <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <footer className="not-found-footer">
        <span>CREWLAB <i>·</i> BUILD IN GOOD COMPANY</span>
        <span>PAGE NOT FOUND <b>///</b></span>
      </footer>
    </main>
  );
}
