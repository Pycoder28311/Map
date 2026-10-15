// The look of a text as one set of settings: what the sidebar's list of the map's other texts offers to copy. Pure (textStyles.test.ts).
import { TEXT_DEFAULT } from './textDefaults'
import type { Board, BoxShape, TextAlign, TextObject } from './types'

/** Everything the text sidebar sets, except where the text is, what it says, and how it is turned */
export const STYLE_KEYS = [
  'size', 'color', 'opacity', 'align', 'fixedSize', 'font', 'weight', 'italic', 'underline', 'strike', 'oblique', 'underlineColor', 'strikeColor',
  'strokeColor', 'strokeWidth', 'strokeOpacity', 'shadowColor', 'shadowBlur', 'shadowDistance', 'curve', 'spacing', 'boxed', 'boxShape', 'boxColor', 'lineGap',
] as const

type Key = (typeof STYLE_KEYS)[number]

/** A text's settings; what is left out has its default */
export type TextStyle = Partial<Pick<TextObject, Key>>

/** The same, with every setting there (a colour that is not set is undefined) */
export type FullStyle = {
  size: number
  color: string
  opacity: number
  align: TextAlign
  fixedSize: boolean
  font: number
  weight: number
  italic: boolean
  underline: boolean
  strike: boolean
  oblique: boolean
  underlineColor: string | undefined
  strikeColor: string | undefined
  strokeColor: string
  strokeWidth: number
  strokeOpacity: number
  shadowColor: string
  shadowBlur: number
  shadowDistance: number
  curve: number
  spacing: number
  boxed: boolean
  boxShape: BoxShape
  boxColor: string | undefined
  lineGap: number
}

export const STYLE_DEFAULTS: FullStyle = {
  size: TEXT_DEFAULT.size,
  color: TEXT_DEFAULT.color,
  opacity: TEXT_DEFAULT.opacity,
  align: TEXT_DEFAULT.align,
  fixedSize: false,
  font: 0,
  weight: 400,
  italic: false,
  underline: false,
  strike: false,
  oblique: false,
  underlineColor: undefined,
  strikeColor: undefined,
  strokeColor: '#000000',
  strokeWidth: 0,
  strokeOpacity: 100,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowDistance: 0,
  curve: 0,
  spacing: 0,
  boxed: false,
  boxShape: 'square',
  boxColor: undefined,
  lineGap: 0,
}

/** Every setting, the defaults where it has none (null counts as none: the pen keeps its colours that way) */
export const fullStyle = (style: TextStyle): FullStyle => {
  const full: Record<string, unknown> = { ...STYLE_DEFAULTS }
  for (const key of STYLE_KEYS) if (style[key] !== undefined && style[key] !== null) full[key] = style[key]
  return full as FullStyle
}

/**
 * The settings of a text (or of the pen: anything with these names), tidied so that looks that are the same compare equal:
 * what is at its default is left out, and so is what has no effect (a stroke colour with no stroke…).
 */
export function styleOf(source: TextStyle): TextStyle {
  const full = fullStyle(source)
  const out: Record<string, unknown> = {}
  const off = {
    strokeColor: full.strokeWidth === 0,
    strokeOpacity: full.strokeWidth === 0,
    shadowColor: full.shadowBlur === 0 && full.shadowDistance === 0,
    underlineColor: !full.underline,
    strikeColor: !full.strike,
    oblique: !full.italic,
    boxShape: !full.boxed,
    boxColor: !full.boxed,
  } as Partial<Record<Key, boolean>>
  for (const key of STYLE_KEYS) {
    if (off[key] || full[key] === undefined || full[key] === STYLE_DEFAULTS[key]) continue
    out[key] = full[key]
  }
  return out as TextStyle
}

/** A string that is the same for the same look */
export const styleKey = (style: TextStyle) => JSON.stringify(STYLE_KEYS.map((key) => style[key] ?? null))

export type StyleEntry = { style: TextStyle; /** What the first text with this look says */ sample: string; /** How many texts have it */ count: number }

/** The looks of the board's texts, most used first (the text `exclude`, and any text that looks like `current`, are left out) */
export function distinctStyles(board: Board, exclude: number | null, current: TextStyle, limit = 12): StyleEntry[] {
  const skip = styleKey(styleOf(current))
  const entries = new Map<string, StyleEntry>()
  for (const o of board.objects) {
    if (o.kind !== 'text' || o.id === exclude) continue
    const style = styleOf(o)
    const key = styleKey(style)
    if (key === skip) continue
    const known = entries.get(key)
    if (known) {
      known.count++
      if (!known.sample.trim()) known.sample = o.text
    } else entries.set(key, { style, sample: o.text, count: 1 })
  }
  return [...entries.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}
