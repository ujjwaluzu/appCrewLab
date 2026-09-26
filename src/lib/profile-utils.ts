export const avatarThemes = [
  { background: "#e7ff70", foreground: "#17251f", border: "#d6ee62" },
  { background: "#d7e8d0", foreground: "#214333", border: "#c3dcc0" },
  { background: "#d8e3ef", foreground: "#25405b", border: "#c4d4e5" },
  { background: "#f1d9c9", foreground: "#633d2b", border: "#e6c5b1" },
  { background: "#e5d8ef", foreground: "#4b315d", border: "#d7c5e4" },
] as const;

export function getInitials(name?: string | null, username?: string | null) {
  const value = (name || username || "CrewLab").trim();
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

export function getAvatarTheme(name?: string | null, username?: string | null) {
  const value = username?.trim() || name?.trim() || "CrewLab";
  const hash = [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
  return avatarThemes[hash % avatarThemes.length];
}

export function getProfileCompletion(profile: {
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  intents?: string[] | null;
}, skillCount: number) {
  const checks = [
    Boolean(profile.display_name?.trim()),
    Boolean(profile.username?.trim()),
    Boolean(profile.bio?.trim()),
    skillCount > 0,
    Boolean(profile.intents?.length),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
