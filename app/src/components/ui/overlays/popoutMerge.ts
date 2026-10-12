// When two bar popouts open side by side (e.g. Search and Share in the Navbar) and nearly touch, they
// become one shape: a bridge in the bar's colour fills the gap between them, as tall as the shorter
// one, and a concave corner below it joins it to the taller one's side. Pure (popoutMerge.test.ts).

/** An open popout's panel, in the popout layer's coordinates (ears excluded) */
export type OpenSpan = { id: string; left: number; right: number; height: number }

/**
 * The piece between two popouts: from `left` to `right`, from the bar's edge down to `height`. It also
 * runs `radius` into the shorter one (both, when they're as tall), covering its rounded inner bottom
 * corner, so that corner looks square. `ear`: the concave corner under the bridge against the taller
 * one's side (none when they're as tall).
 */
export type Bridge = {
  left: number
  right: number
  height: number
  ear?: { left: number; top: number; side: 'left' | 'right' }
}

/** Bridges between neighbouring open popouts whose gap is under 2 × radius (their ears would meet) */
export function bridges(spans: OpenSpan[], radius: number): Bridge[] {
  const sorted = [...spans].sort((a, b) => a.left - b.left)
  const result: Bridge[] = []
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]
    const b = sorted[i]
    const gap = b.left - a.right
    if (gap < 0 || gap >= 2 * radius) continue
    const height = Math.min(a.height, b.height)
    if (a.height === b.height) {
      result.push({ left: a.right - radius, right: b.left + radius, height })
    } else if (a.height < b.height) {
      // b is taller: the corner sits against its left side
      result.push({ left: a.right - radius, right: b.left, height, ear: { left: b.left - radius, top: height, side: 'right' } })
    } else {
      // a is taller: against its right side
      result.push({ left: a.right, right: b.left + radius, height, ear: { left: a.right, top: height, side: 'left' } })
    }
  }
  return result
}

/**
 * Popouts that would overlap are moved apart: each one slides left until it just meets the one on
 * its right (which may be stuck to the bar's end, e.g. Share), so they touch and join (bridges)
 * instead of covering each other. Returns how far each moves (px, ≤ 0; 0 for most).
 */
export function separate(spans: OpenSpan[]): Record<string, number> {
  const sorted = [...spans].sort((a, b) => b.left + b.right - (a.left + a.right))
  const offsets: Record<string, number> = {}
  let limit = Infinity
  for (const s of sorted) {
    const shift = Math.min(0, limit - s.right)
    offsets[s.id] = shift
    limit = s.left + shift
  }
  return offsets
}

/** The spans where they end up (after separate) */
export const shifted = (spans: OpenSpan[], offsets: Record<string, number>): OpenSpan[] =>
  spans.map((s) => ({ ...s, left: s.left + (offsets[s.id] ?? 0), right: s.right + (offsets[s.id] ?? 0) }))
