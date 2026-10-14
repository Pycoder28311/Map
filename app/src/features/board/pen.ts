// What the Line tool and the Border tool draw with: the style, the shape (or none) and the fill. Held while the app runs;
// not part of any map, not undoable (the tool's sidebar edits it when nothing is selected).
import { useSyncExternalStore } from 'react'
import { PENCIL_STYLE } from './style'
import { POINT_DEFAULT } from './pointLabels'
import { TEXT_DEFAULT } from './textDefaults'
import type { Fill, PinIcon, PointLabel, ShapeType, Style, TextAlign } from './types'

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
const border = penStore<Pen>({ style: PENCIL_STYLE, shape: null, param: 0, fill: { color: PENCIL_STYLE.color, opacity: 20 } })

export const getPen = line.get
export const setPen = line.set
export const usePen = line.use
export const getBorderPen = border.get
export const setBorderPen = border.set
export const useBorderPen = border.use

/** What the next text starts with */
export type TextPen = { size: number; color: string; align: TextAlign; opacity: number }
const text = penStore<TextPen>({ size: TEXT_DEFAULT.size, color: TEXT_DEFAULT.color, align: TEXT_DEFAULT.align, opacity: TEXT_DEFAULT.opacity })
export const getTextPen = text.get
export const setTextPen = text.set
export const useTextPen = text.use

/** What the next pin starts with */
export type PointPen = { label: PointLabel; icon: PinIcon; color: string }
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
