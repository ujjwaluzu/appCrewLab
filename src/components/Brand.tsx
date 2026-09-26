import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3" aria-label="CrewLab home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17251f] text-sm font-bold text-[#e7ff70] shadow-[0_8px_20px_rgba(23,37,31,0.16)] transition-transform group-hover:-rotate-6">
        C
      </span>
      <span className="text-lg font-semibold tracking-[-0.04em] text-[#17251f]">CrewLab</span>
    </Link>
  );
}
