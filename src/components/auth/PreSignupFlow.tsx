"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";

const screens = [
  { title: "Build something worth building.", body: "CrewLab helps you turn ideas into real projects with the right people.", detail: "Make space for the work you keep coming back to." },
  { title: "Find your crew.", body: "Discover projects, meet people with complementary skills, and build together.", detail: "Different strengths. One shared direction." },
  { title: "Ready to build?", body: "Create your CrewLab account and get started with a profile that feels like you.", detail: "It only takes a minute to get moving." },
];

export function PreSignupFlow() {
  const [screen, setScreen] = useState(0);
  const current = screens[screen];

  return (
    <AuthShell>
      <div key={current.title} className="animate-fade-in">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="flex gap-2" aria-label={`Step ${screen + 1} of ${screens.length}`}>
            {screens.map((item, index) => <span key={item.title} className={`h-1.5 rounded-full transition-all duration-300 ${index === screen ? "w-10 bg-[#17251f]" : "w-2 bg-[#17251f]/15"}`} />)}
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a958d]">{String(screen + 1).padStart(2, "0")} / 03</span>
        </div>

        <h1 className="max-w-lg text-[clamp(3rem,7vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.075em] text-[#17251f]">{current.title}</h1>
        <p className="mt-7 max-w-md text-lg leading-8 text-[#59665d]">{current.body}</p>

        <div className="mt-8 max-w-md rounded-[1.35rem] border border-[#17251f]/8 bg-[#f7f8f1] p-4">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#171512]"><Image src="/favicon_io/favicon-32x32.png" alt="" width={20} height={20} /></span><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#7a7466]">Crew signal</p><p className="mt-1 text-sm font-semibold leading-6 text-[#4a463f]">{current.detail}</p></div></div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          {screen > 0 ? <button type="button" onClick={() => setScreen((value) => value - 1)} className="order-2 rounded-full px-5 py-3.5 text-sm font-bold text-[#5f6c63] transition hover:bg-[#f0f5df] sm:order-1">Back</button> : null}
          {screen < screens.length - 1 ? <button type="button" onClick={() => setScreen((value) => value + 1)} className="primary-button order-1 sm:order-2">Continue <span aria-hidden>→</span></button> : <Link href="/auth/signup" className="primary-button order-1 sm:order-2">Continue to signup <span aria-hidden>→</span></Link>}
        </div>
        <p className="mt-8 text-sm text-[#69766e]">Already have a CrewLab account? <Link href="/auth/login" className="font-bold text-[#17251f] underline decoration-[#b7c58b] decoration-2 underline-offset-4">Log in</Link></p>
      </div>
    </AuthShell>
  );
}
