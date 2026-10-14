// Where each piece of a text goes: wrapping, lines, alignment. Pure (textLayout.test.ts); the measurer is given, so tests
// need no canvas. The in-place editor copies these rules in CSS so a text does not jump when editing starts or ends.
import { runsOf, type TextAlign, type TextObject, type TextRun } from './types'

/** The width of `text` in `font` (a CSS font string) */
export type Measure = (font: string, text: string) => number

/** Line height as a multiple of the biggest font size on the line */
export const LINE_HEIGHT = 1.25

export type Fragment = { text: string; x: number; run: TextRun & { size: number } }
export type Line = { y: number; height: number; width: number; fragments: Fragment[] }
export type Layout = { lines: Line[]; width: number; height: number }

type Source = { runs: TextRun[]; width: number; size: number; align: TextAlign }

export const fontOf = (run: { bold?: boolean; italic?: boolean }, size: number) => `${run.italic ? 'italic ' : ''}${run.bold ? 700 : 400} ${size}px system-ui, sans-serif`

type Token = { text: string; run: TextRun & { size: number }; space: boolean; newline: boolean }

function tokens(runs: TextRun[], size: number): Token[] {
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
  const lines: { pieces: Pending[]; width: number; trailing: number; size: number }[] = []
  let line = { pieces: [] as Pending[], width: 0, trailing: 0, size: 0 }
  const newLine = () => {
    lines.push(line)
    line = { pieces: [], width: 0, trailing: 0, size: 0 }
  }
  const add = (text: string, run: Fragment['run'], space: boolean) => {
    const width = measure(fontOf(run, run.size), text)
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
      newLine()
      continue
    }
    const width = measure(fontOf(token.run, token.run.size), token.text)
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
        const w = measure(fontOf(token.run, token.run.size), ch)
        if (line.pieces.length > 0 && line.width + w > wrapAt) newLine()
        add(ch, token.run, false)
      }
    } else add(token.text, token.run, false)
  }
  line.size = line.size || source.size
  lines.push(line)

  const widest = Math.max(...lines.map((l) => l.width - l.trailing), 0)
  const box = wrapAt > 0 ? wrapAt : widest
  let y = 0
  const laid: Line[] = lines.map((l) => {
    const size = l.size || source.size
    const height = size * LINE_HEIGHT
    const used = l.width - l.trailing
    let x = source.align === 'center' ? (box - used) / 2 : source.align === 'right' ? box - used : 0
    const fragments = l.pieces.map((p) => {
      const f = { text: p.text, x, run: p.run }
      x += p.width
      return f
    })
    const out = { y, height, width: used, fragments }
    y += height
    return out
  })
  return { lines: laid, width: box, height: y }
}

const cache = new WeakMap<TextObject, Layout>()

/** A text object's layout with the given measurer, worked out once per object (objects are immutable) */
export function layoutOf(o: TextObject, measure: Measure): Layout {
  const known = cache.get(o)
  if (known) return known
  const layout = layoutText({ runs: runsOf(o), width: o.width, size: o.size, align: o.align }, measure)
  cache.set(o, layout)
  return layout
}
