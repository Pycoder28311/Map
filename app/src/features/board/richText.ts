// Runs ⇄ the editor's document (TipTap's JSON): a paragraph per line, marks per stretch. Pure (richText.test.ts).
import { normaliseRuns } from './textRuns'
import type { TextRun } from './types'

export type DocNode = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: DocNode[] }
export type Doc = { type: 'doc'; content: DocNode[] }

const px = (n: number) => `${n}px`
const sizeOf = (value: unknown) => {
  const n = typeof value === 'string' ? Number.parseFloat(value) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

function nodeOf(run: TextRun, text: string): DocNode {
  const marks: NonNullable<DocNode['marks']> = []
  if (run.bold) marks.push({ type: 'bold' })
  if (run.italic) marks.push({ type: 'italic' })
  if (run.underline) marks.push({ type: 'underline' })
  if (run.strike) marks.push({ type: 'strike' })
  if (run.color || run.size !== undefined) marks.push({ type: 'textStyle', attrs: { ...(run.color ? { color: run.color } : {}), ...(run.size !== undefined ? { fontSize: px(run.size) } : {}) } })
  return { type: 'text', text, ...(marks.length ? { marks } : {}) }
}

/** The document for runs: each `\n` starts a paragraph */
export function runsToDoc(runs: TextRun[]): Doc {
  const paragraphs: DocNode[][] = [[]]
  for (const run of runs) {
    run.text.split('\n').forEach((part, i) => {
      if (i > 0) paragraphs.push([])
      if (part !== '') paragraphs[paragraphs.length - 1].push(nodeOf(run, part))
    })
  }
  return { type: 'doc', content: paragraphs.map((nodes) => (nodes.length ? { type: 'paragraph', content: nodes } : { type: 'paragraph' })) }
}

function runOf(node: DocNode): TextRun {
  const run: TextRun = { text: node.text ?? '' }
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') run.bold = true
    else if (mark.type === 'italic') run.italic = true
    else if (mark.type === 'underline') run.underline = true
    else if (mark.type === 'strike') run.strike = true
    else if (mark.type === 'textStyle') {
      if (typeof mark.attrs?.color === 'string' && mark.attrs.color) run.color = mark.attrs.color
      const size = sizeOf(mark.attrs?.fontSize)
      if (size !== undefined) run.size = size
    }
  }
  return run
}

/** The runs of a document: paragraphs are joined with `\n` (a hard break is one too) */
export function docToRuns(doc: Doc): TextRun[] {
  const runs: TextRun[] = []
  doc.content.forEach((paragraph, i) => {
    if (i > 0) runs.push({ text: '\n' })
    for (const node of paragraph.content ?? []) {
      if (node.type === 'text') runs.push(runOf(node))
      else if (node.type === 'hardBreak') runs.push({ text: '\n' })
    }
  })
  return normaliseRuns(runs)
}
