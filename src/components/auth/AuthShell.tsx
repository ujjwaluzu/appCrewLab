import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";
import { DroidPanel } from "@/components/visuals/DroidPanel";

export function AuthShell({ children, aside = true }: { children: ReactNode; aside?: boolean }) {
  return (
    <main className="auth-page min-h-dvh px-3 py-3 text-[#17251f] sm:px-6 sm:py-6">
      <div className="auth-frame mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border bg-[#fcfcf8] sm:min-h-[calc(100dvh-3rem)] lg:flex-row">
        {aside ? (
          <DroidPanel
            className="hidden lg:flex lg:w-[40%] lg:flex-col lg:shrink-0"
            eyebrow="Build in good company"
            title="The right people make good ideas go further."
            body="CrewLab gives ambitious builders a calmer place to find momentum, collaborators, and meaningful work."
          >
            <div className="crew-panel-info">
              <span className="crew-panel-info-mark" aria-hidden="true">
                <svg viewBox="0 0 28 28" width="20" height="20">
                  <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="#D42B1E" />
                  <polygon points="14,8 20,11.5 20,16.5 14,20 8,16.5 8,11.5" fill="#0F0E0C" />
                </svg>
              </span>
              <span><span className="crew-panel-info-label">Crew signal</span></span>
            </div>
          </DroidPanel>
        ) : null}
        <section className="auth-content flex min-w-0 flex-1 flex-col">
          <div className="auth-mobile-brand flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7 lg:hidden">
            <Brand surface="light" />
          </div>
          <div className="flex flex-1 items-center justify-center px-5 pb-8 sm:px-8 sm:pb-12 lg:px-10 xl:px-16 lg:py-12">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
