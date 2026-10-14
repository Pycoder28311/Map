// Runs of text: stretches with their own marks. Pure (textRuns.test.ts). Every function keeps the plain text of the
// runs as they were told it, and returns runs that are tidy (no empty ones, neighbours with the same marks joined).
import type { TextRun } from './types'

export type Marks = Partial<Omit<TextRun, 'text'>>

export const plainOf = (runs: TextRun[]) => runs.map((r) => r.text).join('')

/** Marks that are on, as a comparable string (an unset mark and a false one are the same) */
const signature = (r: TextRun) =>
  [r.bold ? 'b' : '', r.italic ? 'i' : '', r.underline ? 'u' : '', r.strike ? 's' : '', r.color ?? '', r.size ?? ''].join('|')

/** Without empty runs and with neighbours that look the same joined */
export function normaliseRuns(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = []
  for (const run of runs) {
    if (run.text === '') continue
    const last = out[out.length - 1]
    if (last && signature(last) === signature(run)) out[out.length - 1] = { ...last, text: last.text + run.text }
    else out.push({ ...run })
  }
  return out
}

/** Whether two sets of runs read and look the same */
export const runsEqual = (a: TextRun[], b: TextRun[]) => {
  const x = normaliseRuns(a)
  const y = normaliseRuns(b)
  return x.length === y.length && x.every((r, i) => r.text === y[i].text && signature(r) === signature(y[i]))
}

/** The marks applied to the characters from `from` to `to` (a mark given as `undefined` or `false` is taken off) */
export function applyMark(runs: TextRun[], from: number, to: number, marks: Marks): TextRun[] {
  const out: TextRun[] = []
  let at = 0
  for (const run of runs) {
    const start = at
    const end = at + run.text.length
    at = end
    const a = Math.max(from, start)
    const b = Math.min(to, end)
    if (a >= b) {
      out.push(run)
      continue
    }
    const piece = (s: number, e: number, extra: Marks = {}) => {
      const next: TextRun = { ...run, text: run.text.slice(s - start, e - start) }
      for (const [k, v] of Object.entries(extra)) {
        if (v === undefined || v === false) delete next[k as keyof Marks]
        else (next as Record<string, unknown>)[k] = v
      }
      return next
    }
    if (a > start) out.push(piece(start, a))
    out.push(piece(a, b, marks))
    if (b < end) out.push(piece(b, end))
  }
  return normaliseRuns(out)
}

/** Every run's own size multiplied (a text being scaled with the box); runs without a size stay so */
export const scaleRuns = (runs: TextRun[], factor: number): TextRun[] =>
  runs.map((r) => (r.size === undefined ? r : { ...r, size: Math.max(1, Math.round(r.size * factor)) }))

/** What a text's `text` and `runs` become for these runs: no `runs` at all when nothing is marked */
export function textFields(runs: TextRun[]): { text: string; runs?: TextRun[] } {
  const tidy = normaliseRuns(runs)
  const marked = tidy.some((r) => signature(r) !== '|||||')
  return marked ? { text: plainOf(tidy), runs: tidy } : { text: plainOf(tidy), runs: undefined }
}
