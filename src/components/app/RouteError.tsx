"use client";

import Link from "next/link";

export function RouteError({ retry }: { retry: () => void }) {
  return (
    <main className="workspace-main min-h-screen px-5 py-12 sm:px-8 lg:px-12" role="alert">
      <section className="project-empty-state mx-auto max-w-2xl">
        <p className="workspace-eyebrow">Temporary trouble</p>
        <h1 className="mt-2">We couldn&apos;t load this part of CrewLab.</h1>
        <p>Please try again in a moment.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" className="primary-button" onClick={retry}>Try again</button>
          <Link href="/" className="secondary-button">Return to CrewLab</Link>
        </div>
      </section>
    </main>
  );
}
