import Link from "next/link";

export function Brand({ href = "/", surface = "none" }: { href?: string; surface?: "none" | "light" }) {
  const innerColor = surface === "light" ? "#F1EDE4" : "#0F0E0C";

  return (
    <Link href={href} className={`crew-brand ${surface === "light" ? "crew-brand-on-panel" : ""}`} aria-label="CrewLab home">
      <svg viewBox="0 0 28 28" aria-hidden="true" className="crew-brand-mark">
        <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="#D42A1E" />
        <polygon points="14,8 20,11.5 20,16.5 14,20 8,16.5 8,11.5" fill={innerColor} />
      </svg>
      <span>CrewLab</span>
    </Link>
  );
}
