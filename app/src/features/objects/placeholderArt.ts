// Placeholder pictures until objects have real images: a soft colour pattern made from the object's
// id, so it's always the same for one object and differs between objects. Mixed with the theme's
// colours, so it suits light and dark. Pure (placeholderArt.test.ts).
import type { CSSProperties } from 'react'

/** A stable hue (0–359) for an id */
export function hueOf(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  // Spread consecutive ids (a1, a2…) around the wheel
  return (h * 137) % 360
}

/** The picture's background: two soft blobs in the id's hue over the theme's fill */
export function placeholderArt(id: string): CSSProperties {
  const hue = hueOf(id)
  const a = `color-mix(in oklch, hsl(${hue} 70% 60%) 45%, var(--fill))`
  const b = `color-mix(in oklch, hsl(${(hue + 40) % 360} 70% 55%) 35%, var(--fill))`
  return {
    backgroundColor: 'var(--fill)',
    backgroundImage: `radial-gradient(circle at 25% 30%, ${a}, transparent 60%), radial-gradient(circle at 80% 75%, ${b}, transparent 55%)`,
  }
}
