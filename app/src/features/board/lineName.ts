// A line's name: a text attached to it (so it follows the line), set above the middle of the line. Pure (lineName.test.ts).
import { textBox } from './bounds'
import type { Draft } from './changes'
import { lengthOf, flattenedOf } from './pathGeometry'
import { TEXT_DEFAULT } from './textDefaults'
import { LAYER_MAIN, type BoardObject, type LineObject, type Point, type TextObject } from './types'

/** What a new name says until it is edited */
export const LINE_NAME_WORDS = 'Name'
const NAME_SIZE = 18
/** Space between the line's edge and the name's box (board units) */
const GAP = 6

/** The point half way along the polyline (by length), and the direction of the line there in degrees, turned to read left to right (−90 < angle ≤ 90) */
export function midOf(polyline: Point[]): { point: Point; angle: number } {
  const half = lengthOf(polyline) / 2
  let walked = 0
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1]
    const b = polyline[i]
    const step = Math.hypot(b.x - a.x, b.y - a.y)
    if (walked + step >= half && step > 0) {
      const t = (half - walked) / step
      let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
      if (angle > 90) angle -= 180
      else if (angle <= -90) angle += 180
      return { point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, angle }
    }
    walked += step
  }
  return { point: polyline[polyline.length - 1] ?? { x: 0, y: 0 }, angle: 0 }
}

export const midpointOf = (polyline: Point[]): Point => midOf(polyline).point

export type Side = 'above' | 'below'

/** Where a text's box goes (its anchor) and how it turns, so that it sits on `side` of the line at its middle */
function placement(line: LineObject, box: { w: number; h: number }, side: Side): { anchor: Point; rotation: number } {
  const { point, angle } = midOf(flattenedOf(line))
  // The box turns about its centre, which sits this far from the line along the side the text's top faces (above) or away from it (below)
  const away = (line.style.thickness / 2 + GAP + box.h / 2) * (side === 'above' ? 1 : -1)
  const rad = (angle * Math.PI) / 180
  const centre = { x: point.x + Math.sin(rad) * away, y: point.y - Math.cos(rad) * away }
  return { rotation: Math.round(angle), anchor: { x: Math.round(centre.x - box.w / 2), y: Math.round(centre.y - box.h / 2) } }
}

/** The text a line's name button adds: centred above the middle of the line, turned along it, tied to it */
export function newLineNameText(line: LineObject, words = LINE_NAME_WORDS): Draft & { kind: 'text' } {
  const draft: Draft & { kind: 'text' } = {
    kind: 'text',
    layer: LAYER_MAIN,
    name: '',
    links: [{ to: 'board', id: line.id }],
    anchor: { x: 0, y: 0 },
    text: words,
    ...TEXT_DEFAULT,
    align: 'center',
    size: NAME_SIZE,
    color: line.style.color,
    attach: line.id,
  }
  return { ...draft, ...placement(line, textBox({ ...draft, id: 0 } as TextObject), 'above') }
}

/** Which side of the line (at its middle) the text's centre is on */
export function sideOf(line: LineObject, text: TextObject): Side {
  const { point, angle } = midOf(flattenedOf(line))
  const box = textBox(text)
  const rad = (angle * Math.PI) / 180
  const along = (text.anchor.x + box.w / 2 - point.x) * Math.sin(rad) - (text.anchor.y + box.h / 2 - point.y) * Math.cos(rad)
  return along >= 0 ? 'above' : 'below'
}

/** The patch that puts the text on `side` of the line at its middle, turned along it */
export function placeOnSide(line: LineObject, text: TextObject, side: Side): { anchor: Point; rotation: number } {
  return placement(line, textBox(text), side)
}

/** The text tied to this line, if it has one */
export const nameTextOfLine = (objects: BoardObject[], lineId: number): TextObject | null =>
  objects.find((o): o is TextObject => o.kind === 'text' && o.attach === lineId) ?? null
