import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f5ef] px-5 py-5 text-[#17251f] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col rounded-[2rem] border border-[#17251f]/10 bg-[#fcfcf8] shadow-[0_24px_80px_rgba(23,37,31,0.09)] sm:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center justify-between border-b border-[#17251f]/10 px-6 py-6 sm:px-10">
          <Brand />
          <LogoutButton />
        </header>
        <section className="flex flex-1 items-center px-6 py-16 sm:px-10 lg:px-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Your workspace</p>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl">Welcome to CrewLab.</h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[#59665d]">Your workspace is coming together. The rest of CrewLab will meet you here soon.</p>
            <div className="mt-12 inline-flex items-center gap-3 rounded-full bg-[#f0f5df] px-5 py-3 text-sm font-semibold text-[#40513c]"><span className="h-2 w-2 rounded-full bg-[#91a94c]" /> Profile complete</div>
          </div>
        </section>
      </div>
    </main>
  );
}
