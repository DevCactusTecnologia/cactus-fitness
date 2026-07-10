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

// Per-user color overrides (keyed by user id).
const COLOR_OVERRIDES: Record<string, { bg: string; fg: string }> = {
  // academia@gmail.com → rosa
  "5060f0c7-b76f-431b-90b3-a272666eae4b": { bg: "rgb(244, 63, 94)", fg: "#fff" },
};

export function colorForId(id: string) {
  if (COLOR_OVERRIDES[id]) return COLOR_OVERRIDES[id];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
