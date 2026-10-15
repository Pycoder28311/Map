// What the Line tool and the Border tool draw with: the style, the shape (or none) and the fill. Held while the app runs;
// not part of any map, not undoable (the tool's sidebar edits it when nothing is selected).
import { useSyncExternalStore } from 'react'
import { PENCIL_STYLE } from './style'
import { POINT_DEFAULT } from './pointLabels'
import { TEXT_DEFAULT } from './textDefaults'
import type { BoxShape, Fill, PinIcon, PointLabel, ShapeType, Style, TextAlign } from './types'

export type Pen = {
  style: Style
  /** Line: null draws a line. Border: null draws mouse-like or linear (by `style.way`) */
  shape: ShapeType | null
  param: number
  fill: Fill | null
}

function penStore<T>(start: T) {
  let pen = start
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  return {
    get: () => pen,
    set(patch: Partial<T>) {
      pen = { ...pen, ...patch }
      emit()
    },
    reset() {
      pen = start
      emit()
    },
    use: () =>
      useSyncExternalStore(
        (l) => {
          listeners.add(l)
          return () => listeners.delete(l)
        },
        () => pen,
      ),
  }
}

const line = penStore<Pen>({ style: PENCIL_STYLE, shape: null, param: 0, fill: null })
/** An area: mouse-like way, its inside lightly in the border's colour */
const border = penStore<Pen>({ style: PENCIL_STYLE, shape: null, param: 0, fill: null })

export const getPen = line.get
export const setPen = line.set
export const usePen = line.use
export const getBorderPen = border.get
export const setBorderPen = border.set
export const useBorderPen = border.use

/** What the next text starts with */
export type TextPen = { size: number; color: string; align: TextAlign; opacity: number; fixedSize: boolean; font: number; weight: number; italic: boolean; underline: boolean; strike: boolean; oblique: boolean; underlineColor: string | null; strikeColor: string | null; strokeColor: string; strokeWidth: number; strokeOpacity: number; shadowColor: string; shadowBlur: number; shadowDistance: number; curve: number; spacing: number; boxed: boolean; boxShape: BoxShape; lineGap: number; boxColor: string | null; rotation: number }
const text = penStore<TextPen>({ size: TEXT_DEFAULT.size, color: TEXT_DEFAULT.color, align: TEXT_DEFAULT.align, opacity: TEXT_DEFAULT.opacity, fixedSize: false, font: 0, weight: 400, italic: false, underline: false, strike: false, oblique: false, underlineColor: null, strikeColor: null, strokeColor: '#000000', strokeWidth: 0, strokeOpacity: 100, shadowColor: '#000000', shadowBlur: 0, shadowDistance: 0, curve: 0, spacing: 0, boxed: false, boxShape: 'square', lineGap: 0, boxColor: null, rotation: 0 })
export const getTextPen = text.get
export const setTextPen = text.set
export const useTextPen = text.use

/** What the next pin starts with */
export type PointPen = { label: PointLabel; icon: PinIcon; color: string; /** The picture on top of the pin's sidebar (an image id; absent: none) */ banner?: string }
const point = penStore<PointPen>({ ...POINT_DEFAULT })
export const getPointPen = point.get
export const setPointPen = point.set
export const usePointPen = point.use

export function resetPen() {
  point.reset()
  text.reset()
  line.reset()
  border.reset()
}
