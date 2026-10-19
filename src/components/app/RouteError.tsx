"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Brand } from "@/components/Brand";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export function RouteError({ error, retry }: RouteErrorProps) {
  useEffect(() => {
    console.error("[route] Page failed to load", error);
  }, [error]);

  return (
    <main className="route-error-page" role="alert">
      <header className="route-error-header"><Brand /></header>
      <section className="route-error-card">
        <span className="route-error-mark" aria-hidden="true">!</span>
        <p className="workspace-eyebrow">Page unavailable</p>
        <h1>We hit a snag loading this page.</h1>
        <p className="route-error-copy">The request didn&apos;t finish successfully. You can retry it now; if it keeps happening, share the reference code with the CrewLab team.</p>
        {error.digest ? <p className="route-error-reference">Reference <code>{error.digest}</code></p> : null}
        {process.env.NODE_ENV === "development" && error.message ? <details className="route-error-details"><summary>Developer details</summary><pre>{error.message}</pre></details> : null}
        <div className="route-error-actions">
          <button type="button" className="primary-button" onClick={retry}>Retry page</button>
          <Link href="/home" className="secondary-button">Go to CrewLab home</Link>
        </div>
      </section>
    </main>
  );
}
