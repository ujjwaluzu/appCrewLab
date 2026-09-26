import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/", surface = "none" }: { href?: string; surface?: "none" | "light" }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3" aria-label="CrewLab home">
      <span className={surface === "light" ? "rounded-2xl bg-[#fcfcf8] px-3 py-2 shadow-[0_8px_20px_rgba(23,37,31,0.12)]" : ""}>
        <Image src="/crewlab-logo.webp" alt="CrewLab" width={178} height={46} priority className="h-9 w-auto transition-transform group-hover:-translate-y-0.5" />
      </span>
    </Link>
  );
}
