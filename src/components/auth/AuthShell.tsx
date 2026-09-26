import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";

export function AuthShell({ children, aside = true }: { children: ReactNode; aside?: boolean }) {
  return (
    <main className="min-h-screen bg-[#f4f5ef] px-5 py-5 text-[#17251f] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[#17251f]/10 bg-[#fcfcf8] shadow-[0_24px_80px_rgba(23,37,31,0.09)] sm:min-h-[calc(100vh-4rem)] lg:flex-row">
        {aside ? (
          <aside className="relative hidden overflow-hidden bg-[#17251f] p-10 text-[#f8faef] lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#e7ff70]/20" />
            <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border border-[#e7ff70]/10" />
            <Brand />
            <div className="relative max-w-sm">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#e7ff70]">Build in good company</p>
              <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.065em]">
                The right people make good ideas go further.
              </h1>
              <p className="mt-6 max-w-xs text-base leading-7 text-[#d6ded5]">
                CrewLab gives ambitious builders a calmer place to find momentum, collaborators, and meaningful work.
              </p>
            </div>
            <p className="relative text-sm text-[#9faf9f]">A workspace for people who want to build.</p>
          </aside>
        ) : null}
        <section className="flex flex-1 flex-col">
          <header className="flex items-center justify-between px-6 py-6 sm:px-10 lg:hidden">
            <Brand />
          </header>
          <div className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10 sm:pb-12 lg:px-16 lg:py-14">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
