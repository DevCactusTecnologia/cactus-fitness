function rgbStringToTuple(color: string): [number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function hexToTuple(color: string): [number, number, number] | null {
  const raw = color.trim().replace("#", "");
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw)) return null;
  const hex = raw.length === 3
    ? raw.split("").map((ch) => ch + ch).join("")
    : raw;
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
}

function colorToTuple(color: string): [number, number, number] | null {
  const trimmed = color.trim();
  return trimmed.startsWith("#") ? hexToTuple(trimmed) : rgbStringToTuple(trimmed);
}

function rgbToHslTuple([red, green, blue]: [number, number, number]): string {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function rgbToRgba([r, g, b]: [number, number, number], alpha: number) {
  return `rgba(${r},${g},${b},${alpha})`;
}

export function applyPrimaryColor(color: string | null | undefined) {
  if (typeof document === "undefined" || !color) return;
  const tuple = colorToTuple(color);
  if (!tuple) return;
  const hsl = rgbToHslTuple(tuple);
  const root = document.documentElement;
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--primary-glow", rgbToRgba(tuple, 0.15));
  root.style.setProperty("--primary-glow-medium", rgbToRgba(tuple, 0.2));
  root.style.setProperty("--primary-glow-strong", rgbToRgba(tuple, 0.3));
}