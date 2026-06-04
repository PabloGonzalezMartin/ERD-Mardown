/** WCAG relative luminance for a #rrggbb hex color. Returns null if not parseable. */
function relativeLuminance(hex: string): number | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const r = lin(parseInt(m[1].slice(0, 2), 16) / 255);
  const g = lin(parseInt(m[1].slice(2, 4), 16) / 255);
  const b = lin(parseInt(m[1].slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns `stored` if it has enough contrast (≥3:1) against its background.
 * Otherwise returns a readable fallback that matches the background brightness.
 *
 * @param stored   The user-chosen hex color.
 * @param isDark   Whether the UI is currently in dark mode.
 * @param solidBg  Optional solid hex background behind the text (e.g. a comment's bgColor).
 *                 When absent or not parseable, the canvas background is assumed.
 */
export function readableColor(stored: string, isDark: boolean, solidBg?: string): string {
  const textLum = relativeLuminance(stored);
  if (textLum === null) return stored; // not a plain hex — leave untouched

  const parsedBg = solidBg ? relativeLuminance(solidBg) : null;
  // Canvas approximate luminance: VS Code dark ~0.02, light ~0.95
  const bgLum = parsedBg ?? (isDark ? 0.02 : 0.95);

  const lighter = Math.max(textLum, bgLum);
  const darker  = Math.min(textLum, bgLum);
  const ratio   = (lighter + 0.05) / (darker + 0.05);

  if (ratio >= 3) return stored;
  // Pick fallback that contrasts with the background
  return bgLum > 0.5 ? '#444444' : '#cccccc';
}
