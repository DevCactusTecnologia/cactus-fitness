export const AVATAR_COLORS = [
  { bg: "oklch(0.35 0.15 25)", fg: "oklch(0.85 0.15 25)" },
  { bg: "oklch(0.35 0.15 55)", fg: "oklch(0.85 0.15 55)" },
  { bg: "oklch(0.35 0.15 90)", fg: "oklch(0.85 0.15 90)" },
  { bg: "oklch(0.35 0.15 145)", fg: "oklch(0.85 0.15 145)" },
  { bg: "oklch(0.35 0.15 200)", fg: "oklch(0.85 0.15 200)" },
  { bg: "oklch(0.35 0.15 245)", fg: "oklch(0.85 0.15 245)" },
  { bg: "oklch(0.35 0.15 295)", fg: "oklch(0.85 0.15 295)" },
  { bg: "oklch(0.35 0.15 340)", fg: "oklch(0.85 0.15 340)" },
];

export function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
