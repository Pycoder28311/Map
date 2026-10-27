// The cracked edge between the two parts of the image cards: one line of small straight pieces, shared by both. Pure (crack.test.ts).

export { seededRandom as random } from '../../../lib/seededRandom'
import { seededRandom as random } from '../../../lib/seededRandom'

const round = (value: number) => Math.round(value * 10) / 10

// ── The two numbers to change ────────────────────────────────────────────────────────────────────────────────────────────────────
/** How many points the crack has, where the line changes direction: more points, shorter and more pieces (3 to 60) */
export const CRACK_POINTS = 20
/** How steep the pieces are, in degrees: 0 is a straight line, 45 pieces as steep as they are long, up to 80 (the steepest even piece; the uneven ones go beyond) */
export const CRACK_ANGLE = 35
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The card's width (px): size-48 in cardStyles.ts, 12rem. Keep them equal: the steepness is worked out from it */
const CARD_WIDTH = 192
/** How far the crack wanders up and down (px, in all: from its highest point to its lowest): a piece's length times the tangent of its angle */
export const CRACK_DEPTH = Math.round((CARD_WIDTH / CRACK_POINTS) * Math.tan((Math.min(80, Math.max(0, CRACK_ANGLE)) * Math.PI) / 180))
/** The space between the two parts, the same along the whole crack (px): 0, they touch (the picture goes on behind the text part). A number, not a token: it is used in the clip-path's points */
export const CRACK_GAP = 0
/** How far down from the top of the text's box the crack can reach (px): the text starts below it */
export const CRACK_REACH = CRACK_DEPTH * 1.5 + CRACK_GAP / 2
/** How many straight pieces the crack is made of */
const PIECES = Math.round(Math.min(60, Math.max(3, CRACK_POINTS)))

/**
 * The cracked edge between the two parts of an image card: ONE line of small straight pieces, and from it the two `clip-path` polygons that
 * follow it, the picture's bottom edge and the text's top edge, `CRACK_GAP` apart all along (the same line, one above the other). The other
 * sides of both are straight, so only the edge they touch is cracked. From a seed (the card's id): a card has the same crack every time.
 *
 * Both parts are boxes that reach `depth` past the crack's middle line (the picture's goes down, the text's goes up), so the line can wander
 * either way: the picture box is `depth` taller than its share of the card and the text box starts `2 × depth` above where the picture box ends.
 * `pieces`: how many straight pieces (default: CRACK_POINTS; a wider box, like the article banner, takes more). Pure (crack.test.ts).
 */
export function crackedPolygons(seed: string, depth = CRACK_DEPTH, gap = CRACK_GAP, pieces = PIECES): { top: string; bottom: string } {
  const next = random(seed)
  // Where the pieces meet along the width (the inner ones a little off their even places), and how high or low the line is there
  const xs = Array.from({ length: pieces + 1 }, (_, k) => (k === 0 ? 0 : k === pieces ? 100 : round(((k + (next() - 0.5) * 0.8) / pieces) * 100)))
  const wander = xs.map(() => round((next() - 0.5) * depth))
  // From the picture box's bottom edge up to its edge of the crack, and from the text box's top edge down to its edge of the crack
  const above = (u: number) => round(depth - u + gap / 2)
  const below = (u: number) => round(depth + u + gap / 2)
  const top = ['0 0', '100% 0', ...xs.map((x, k) => `${x}% calc(100% - ${above(wander[k])}px)`).reverse()]
  const bottom = [...xs.map((x, k) => `${x}% ${below(wander[k])}px`), '100% 100%', '0 100%']
  return { top: `polygon(${top.join(', ')})`, bottom: `polygon(${bottom.join(', ')})` }
}
