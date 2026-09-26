import { getAvatarTheme, getInitials } from "@/lib/profile-utils";

const sizeClasses = {
  sm: "h-8 w-8 text-[0.65rem]",
  md: "h-10 w-10 text-xs",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-3xl",
} as const;

export function Avatar({
  name,
  username,
  size = "md",
}: {
  name?: string | null;
  username?: string | null;
  size?: keyof typeof sizeClasses;
}) {
  const theme = getAvatarTheme(name, username);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[30%] border font-bold tracking-[-0.04em] ${sizeClasses[size]}`}
      style={{ backgroundColor: theme.background, color: theme.foreground, borderColor: theme.border }}
      aria-label={`${name || username || "CrewLab"} avatar`}
    >
      {getInitials(name, username)}
    </span>
  );
}
