"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";

const screens = [
  {
    eyebrow: "Start with a spark",
    title: "Build something worth building.",
    body: "CrewLab helps you turn ideas into real projects with the right people.",
    detail: "Make space for the work you keep coming back to.",
  },
  {
    eyebrow: "Find your people",
    title: "Find your crew.",
    body: "Discover projects, meet people with complementary skills, and build together.",
    detail: "Different strengths. One shared direction.",
  },
  {
    eyebrow: "Your next chapter",
    title: "Ready to build?",
    body: "Create your CrewLab account and get started with a profile that feels like you.",
    detail: "It only takes a minute to get moving.",
  },
];

export function PreSignupFlow() {
  const [screen, setScreen] = useState(0);
  const current = screens[screen];

  return (
    <AuthShell>
      <div className="animate-fade-in">
        <div className="mb-12 flex items-center justify-between">
          <div className="flex gap-2" aria-label={`Step ${screen + 1} of ${screens.length}`}>
            {screens.map((item, index) => (
              <span key={item.title} className={`h-1.5 rounded-full transition-all ${index === screen ? "w-10 bg-[#17251f]" : "w-2 bg-[#17251f]/15"}`} />
            ))}
          </div>
          <Link href="/auth/login" className="text-sm font-semibold text-[#5f6c63] underline-offset-4 hover:text-[#17251f] hover:underline">
            Log in
          </Link>
        </div>

        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">{current.eyebrow}</p>
        <h1 className="max-w-lg text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[#17251f] sm:text-6xl">{current.title}</h1>
        <p className="mt-7 max-w-md text-lg leading-8 text-[#59665d]">{current.body}</p>
        <p className="mt-4 text-sm font-medium text-[#879188]">{current.detail}</p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          {screen > 0 ? (
            <button type="button" onClick={() => setScreen((value) => value - 1)} className="order-2 rounded-full px-5 py-3.5 text-sm font-semibold text-[#5f6c63] transition hover:bg-[#17251f]/5 sm:order-1">
              Back
            </button>
          ) : null}
          {screen < screens.length - 1 ? (
            <button type="button" onClick={() => setScreen((value) => value + 1)} className="order-1 inline-flex items-center justify-center gap-3 rounded-full bg-[#17251f] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,37,31,0.16)] transition hover:-translate-y-0.5 hover:bg-[#25372f] sm:order-2">
              Continue <span aria-hidden>→</span>
            </button>
          ) : (
            <Link href="/auth/signup" className="order-1 inline-flex items-center justify-center gap-3 rounded-full bg-[#17251f] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,37,31,0.16)] transition hover:-translate-y-0.5 hover:bg-[#25372f] sm:order-2">
              Continue to signup <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
