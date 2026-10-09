const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
// WCAG 2.1 sRGB linearization constants.
const SRGB_KNEE = 0.04045;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_GAMMA = 2.4;
// WCAG flare term added to both luminances in the contrast ratio.
const FLARE = 0.05;

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= SRGB_KNEE ? c / SRGB_LINEAR_SLOPE : ((c + 0.055) / 1.055) ** SRGB_GAMMA;
}

/** WCAG 2.1 relative luminance of a `#rrggbb` color. */
function relativeLuminance(hex: string): number {
  const match = HEX_COLOR.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb hex color, got "${hex}"`);
  const [r, g, b] = match.slice(1).map((part) => channelToLinear(parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colors, from 1 to 21. */
export function contrastRatio(hexA: string, hexB: string): number {
  const [lighter, darker] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort(
    (a, b) => b - a,
  );
  return (lighter + FLARE) / (darker + FLARE);
}
