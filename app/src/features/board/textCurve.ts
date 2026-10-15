// Curved text: the lines of a text laid along circles that share a centre. Pure (textCurve.test.ts).
// `curve` is -100…100: 0 is straight, 100 bends the text a half circle over (like a rainbow), -100 under (like a smile).

export const CURVE_MAX = 100

/** The circle the first line's top edge sits on, for a text `width` wide (the arc of the text is `curve`% of a half circle) */
export function arcOf(curve: number, width: number) {
  const theta = (Math.min(Math.abs(curve), CURVE_MAX) / CURVE_MAX) * Math.PI
  return { theta, radius: Math.max(width, 1) / theta }
}

/** How far the ends of the text sit away from its middle (the box grows by this, down for a rainbow, up for a smile) */
export function sagitta(curve: number, width: number) {
  if (curve === 0) return 0
  const { theta, radius } = arcOf(curve, width)
  return radius * (1 - Math.cos(theta / 2))
}

/**
 * Where a letter goes: `dx` along the line from the text's middle, the line's baseline `y` below the box's top (the box without
 * the room for the bend). Gives the letter's middle on the baseline and how far it is turned (radians, clockwise).
 */
export function placeOnArc(curve: number, width: number, y: number, dx: number) {
  const { radius } = arcOf(curve, width)
  const up = curve > 0
  // Lower lines are inside a rainbow's circle and outside a smile's: letters keep their spacing along their own line
  const r = Math.max(up ? radius - y : radius + y, 1)
  const phi = dx / r
  return {
    x: width / 2 + r * Math.sin(phi),
    y: up ? radius - r * Math.cos(phi) : -radius + r * Math.cos(phi),
    angle: up ? phi : -phi,
  }
}
