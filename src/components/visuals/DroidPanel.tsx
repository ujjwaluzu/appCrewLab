import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";
import { FeatureDroid } from "@/components/visuals/FeatureDroid";

type DroidPanelProps = {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function DroidPanel({ eyebrow, title, body, children, className = "", compact = false }: DroidPanelProps) {
  return (
    <aside className={`crew-droid-panel aiptx-droid-stage ${className}`}>
      <div className="crew-panel-grid" aria-hidden="true" />
      <div className="crew-panel-orb crew-panel-orb-one" aria-hidden="true" />
      <div className="crew-panel-orb crew-panel-orb-two" aria-hidden="true" />

      <div className="relative z-20 flex h-full min-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-4">
          <Brand surface="light" />
        </div>

        <div className={`relative max-w-[19rem] ${compact ? "mt-12 sm:mt-16" : "mt-14 sm:mt-20"}`}>
          <p className="crew-panel-eyebrow">{eyebrow}</p>
          <h1 className={`mt-5 font-semibold leading-[0.98] tracking-[-0.065em] text-[#f1ede4] ${compact ? "text-4xl sm:text-[2.9rem]" : "text-5xl sm:text-[3.6rem]"}`}>
            {title}
          </h1>
          <p className="mt-6 max-w-[17rem] text-[0.98rem] leading-7 text-[#c9c3b5]">{body}</p>
        </div>

        {children ? <div className="relative z-20 mt-auto pt-10">{children}</div> : null}
      </div>

      <div className="crew-droid-glow" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-16 right-[-2.5rem] z-10 w-48 opacity-90 sm:w-56 lg:w-64">
        <FeatureDroid />
      </div>
    </aside>
  );
}
