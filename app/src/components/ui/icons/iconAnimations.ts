// Full class strings so Tailwind can detect them at build time.
// Each animation runs while the button's main area (icon + text) is hovered (`group/main`).
// Layered icons apply it to their moving part; plain icons move as a whole.
export const iconAnimations = {
  none: '',
  download: 'motion-safe:group-hover/main:animate-download',
} as const

export type IconAnimation = keyof typeof iconAnimations
