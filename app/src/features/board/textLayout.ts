// Where each piece of a text goes: wrapping, lines, alignment. Pure (textLayout.test.ts); the measurer is given, so tests
// need no canvas. The in-place editor copies these rules in CSS so a text does not jump when editing starts or ends.
import { WEIGHT_BOLD, WEIGHT_NORMAL, stackOf } from './fonts'
import { runsOf, type LaidRun, type TextAlign, type TextObject } from './types'

/** The width of `text` in `font` (a CSS font string) */
export type Measure = (font: string, text: string) => number

/** Line height as a multiple of the biggest font size on the line */
export const LINE_HEIGHT = 1.25

export type Fragment = { text: string; x: number; run: LaidRun & { size: number } }
export type Line = { y: number; size: number; height: number; width: number; fragments: Fragment[] }
export type Layout = { lines: Line[]; width: number; height: number }

type Source = { runs: LaidRun[]; width: number; size: number; align: TextAlign; lineGap?: number }

export const fontOf = (run: { bold?: boolean; italic?: boolean; oblique?: boolean; weight?: number; family?: string }, size: number) =>
  `${run.italic ? (run.oblique ? 'oblique ' : 'italic ') : ''}${run.bold ? Math.max(WEIGHT_BOLD, run.weight ?? 0) : (run.weight ?? WEIGHT_NORMAL)} ${size}px ${run.family ?? stackOf(undefined)}`

/** The width of `text` in the run's font, with its letter spacing after every letter */
export const widthOf = (measure: Measure, run: LaidRun & { size: number }, text: string) => measure(fontOf(run, run.size), text) + (run.spacing ?? 0) * Array.from(text).length

type Token = { text: string; run: LaidRun & { size: number }; space: boolean; newline: boolean }

function tokens(runs: LaidRun[], size: number): Token[] {
  const out: Token[] = []
  for (const run of runs) {
    const resolved = { ...run, size: run.size ?? size }
    run.text.split('\n').forEach((part, i) => {
      if (i > 0) out.push({ text: '', run: resolved, space: false, newline: true })
      for (const piece of part.match(/\s+|\S+/g) ?? []) out.push({ text: piece, run: resolved, space: /^\s/.test(piece), newline: false })
    })
  }
  return out
}

/** The text laid out: `width` 0 never wraps */
export function layoutText(source: Source, measure: Measure): Layout {
  const wrapAt = source.width
  type Pending = { text: string; run: Fragment['run']; width: number }
  // `hard`: the line ends the paragraph (a new line or the end), so a justified text leaves it as it is
  const lines: { pieces: Pending[]; width: number; trailing: number; size: number; hard: boolean }[] = []
  let line = { pieces: [] as Pending[], width: 0, trailing: 0, size: 0, hard: false }
  const newLine = () => {
    lines.push(line)
    line = { pieces: [], width: 0, trailing: 0, size: 0, hard: false }
  }
  const add = (text: string, run: Fragment['run'], space: boolean) => {
    const width = widthOf(measure, run, text)
    const last = line.pieces[line.pieces.length - 1]
    if (last && last.run === run) {
      last.text += text
      last.width += width
    } else line.pieces.push({ text, run, width })
    line.width += width
    line.trailing = space ? line.trailing + width : 0
    line.size = Math.max(line.size, run.size)
  }

  for (const token of tokens(source.runs, source.size)) {
    if (token.newline) {
      line.size = Math.max(line.size, token.run.size)
      line.hard = true
      newLine()
      continue
    }
    const width = widthOf(measure, token.run, token.text)
    if (token.space) {
      add(token.text, token.run, true)
      continue
    }
    if (wrapAt > 0 && line.pieces.length > 0 && line.width + width > wrapAt) {
      // The word does not fit on this line: the line ends (its trailing spaces go) and the word starts the next
      line.width -= line.trailing
      line.trailing = 0
      newLine()
    }
    if (wrapAt > 0 && width > wrapAt) {
      // A word longer than the whole width breaks by character
      for (const ch of Array.from(token.text)) {
        const w = widthOf(measure, token.run, ch)
        if (line.pieces.length > 0 && line.width + w > wrapAt) newLine()
        add(ch, token.run, false)
      }
    } else add(token.text, token.run, false)
  }
  line.size = line.size || source.size
  line.hard = true
  lines.push(line)

  const widest = Math.max(...lines.map((l) => l.width - l.trailing), 0)
  const box = wrapAt > 0 ? wrapAt : widest
  let y = 0
  const laid: Line[] = lines.map((l) => {
    const size = l.size || source.size
    // The extra space is under the line, so the first line stays where it was
    const height = size * LINE_HEIGHT + (source.lineGap ?? 0)
    const used = l.width - l.trailing
    let x = source.align === 'center' ? (box - used) / 2 : source.align === 'right' ? box - used : 0
    // Justified (a wrapping text only): the spaces of every line but a paragraph's last share what the line leaves over
    const justify = source.align === 'justify' && wrapAt > 0 && !l.hard
    const parts = justify
      ? l.pieces.flatMap((p) => (p.text.match(/\s+|\S+/g) ?? []).map((text) => ({ text, run: p.run, space: /^\s/.test(text), width: widthOf(measure, p.run, text) })))
      : l.pieces.map((p) => ({ text: p.text, run: p.run, space: false, width: p.width }))
    let end = parts.length
    while (justify && end > 0 && parts[end - 1].space) end--
    const gaps = justify ? parts.slice(0, end).filter((p) => p.space).length : 0
    const extra = gaps > 0 ? Math.max(0, box - used) / gaps : 0
    const fragments = parts.map((p, i) => {
      const f = { text: p.text, x, run: p.run }
      x += p.width + (p.space && i < end ? extra : 0)
      return f
    })
    const out = { y, size, height, width: used, fragments }
    y += height
    return out
  })
  // No space under the last line
  return { lines: laid, width: box, height: laid.length > 0 ? y - (source.lineGap ?? 0) : y }
}

const cache = new WeakMap<TextObject, Layout>()

/** A text object's layout with the given measurer, worked out once per object (objects are immutable) */
export function layoutOf(o: TextObject, measure: Measure): Layout {
  const known = cache.get(o)
  if (known) return known
  // The text's own font, weight and marks go into every run, so painting and measuring need nothing else
  const family = stackOf(o.font)
  const runs: LaidRun[] = runsOf(o).map((r) => ({ ...r, family, weight: o.weight, ...(o.spacing ? { spacing: o.spacing } : {}), ...(o.oblique ? { oblique: true } : {}), ...(o.underlineColor ? { underlineColor: o.underlineColor } : {}), ...(o.strikeColor ? { strikeColor: o.strikeColor } : {}), ...(o.italic ? { italic: true } : {}), ...(o.underline ? { underline: true } : {}), ...(o.strike ? { strike: true } : {}) }))
  const layout = layoutText({ runs, width: o.width, size: o.size, align: o.align, lineGap: o.lineGap }, measure)
  cache.set(o, layout)
  return layout
}
