/**
 * Turn a human string into a URL-safe slug.
 * "Peito & Tríceps" -> "peito-triceps"
 * Slugs here are cosmetic — lookups always use the canonical uuid.
 */
export function slugify(input: string | null | undefined): string {
  if (!input) return "treino";
  const s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "treino";
}

/** 0 -> "a", 1 -> "b", ... 25 -> "z". Returns undefined outside range. */
export function blockIndexToLetter(idx: number | null | undefined): string | undefined {
  if (idx == null || !Number.isFinite(idx) || idx < 0 || idx > 25) return undefined;
  return String.fromCharCode(97 + Math.floor(idx));
}

/** "a" -> 0, "b" -> 1, ... "z" -> 25. Returns undefined for invalid. */
export function letterToBlockIndex(letter: string | null | undefined): number | undefined {
  if (!letter || typeof letter !== "string") return undefined;
  const c = letter.trim().toLowerCase();
  if (!/^[a-z]$/.test(c)) return undefined;
  return c.charCodeAt(0) - 97;
}
