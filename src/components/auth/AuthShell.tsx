import type { ReactNode } from "react";
import Image from "next/image";

import { DroidPanel } from "@/components/visuals/DroidPanel";

export function AuthShell({ children, aside = true }: { children: ReactNode; aside?: boolean }) {
  return (
    <main className="auth-page min-h-screen px-4 py-4 text-[#17251f] sm:px-7 sm:py-7">
      <div className="auth-frame mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border bg-[#fcfcf8] sm:min-h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:flex-row">
        {aside ? (
          <DroidPanel
            className="hidden lg:flex lg:w-[42%] lg:flex-col"
            eyebrow="Build in good company"
            title="The right people make good ideas go further."
            body="CrewLab gives ambitious builders a calmer place to find momentum, collaborators, and meaningful work."
          >
            <div className="crew-panel-info">
              <span className="crew-panel-info-mark"><Image src="/favicon_io/favicon-32x32.png" alt="" width={20} height={20} /></span>
              <span><span className="crew-panel-info-label">Crew signal</span></span>
            </div>
          </DroidPanel>
        ) : null}
        <section className="auth-content flex flex-1 flex-col">
          <div className="flex items-center justify-between px-6 py-6 sm:px-10 lg:hidden">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#171512] text-sm font-black text-[#f1ede4]">C</span><span className="text-lg font-black tracking-[-0.06em]">CrewLab</span></div>
          </div>
          <div className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10 sm:pb-12 lg:px-16 lg:py-14">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
