// The article's text as one ProseMirror document, read in sections (its top-level blocks): which sections the editor holds (a window,
// for a big text), and the document with the window's new content put back, or with a section moved (docs/plans/36).
// Pure on ProseMirror nodes (articleDoc.test.ts); parsing and writing HTML need a DOM.
import { createDocument, getHTMLFromFragment } from '@tiptap/core'
import { Fragment, type Node as PMNode, type Schema } from '@tiptap/pm/model'

/**
 * When a text is big (more sections or more characters of HTML than this), only a window of sections around the click is edited:
 * `around` sections on each side of it. The window moves when the caret is within `edge` sections of its end. Tuned here only
 */
export const WINDOW = { maxSections: 60, maxChars: 30_000, around: 25, edge: 5 } as const

/** The sections the editor holds: from `start` to `end` (not included) */
export type TextWindow = { start: number; end: number }

/** HTML → the document (as the editor itself reads it) */
export const parseArticle = (html: string, schema: Schema): PMNode => createDocument(html, schema)

/** Sections → their HTML (as the editor writes it: `editor.getHTML()` of the same blocks) */
export const htmlOf = (content: Fragment, schema: Schema): string => getHTMLFromFragment(content, schema)

/** Whether only a window of the text is edited at a time */
export const isBig = (doc: PMNode, htmlLength: number) => doc.childCount > WINDOW.maxSections || htmlLength > WINDOW.maxChars

/** The whole text as a window */
export const wholeWindow = (doc: PMNode): TextWindow => ({ start: 0, end: doc.childCount })

export const isWhole = (doc: PMNode, window: TextWindow) => window.start === 0 && window.end === doc.childCount

/** The window around section `index` of a text of `count` sections */
export function windowAround(count: number, index: number): TextWindow {
  const at = Math.min(Math.max(index, 0), Math.max(count - 1, 0))
  return { start: Math.max(0, at - WINDOW.around), end: Math.min(count, at + WINDOW.around + 1) }
}

/** Whether the caret's section (`index`) is so near an end of the window that it should move (there is more text that way) */
export function needsShift(window: TextWindow, index: number, count: number): boolean {
  return (window.start > 0 && index - window.start < WINDOW.edge) || (window.end < count && window.end - 1 - index < WINDOW.edge)
}

/** Where section `index` starts in the document (its position before it); `index` = the number of sections: the end */
export function sectionStart(doc: PMNode, index: number): number {
  let pos = 0
  for (let i = 0; i < Math.min(index, doc.childCount); i++) pos += doc.child(i).nodeSize
  return pos
}

/** The section a position is in (a position between two sections: the one after it; the end: the last one) */
export function sectionAt(doc: PMNode, pos: number): number {
  if (doc.childCount === 0) return 0
  const clamped = Math.min(Math.max(pos, 0), doc.content.size)
  return Math.min(doc.resolve(clamped).index(0), doc.childCount - 1)
}

/** The window's sections as a document of their own (what the editor holds) */
export function windowDoc(doc: PMNode, window: TextWindow): PMNode {
  return doc.copy(doc.content.cut(sectionStart(doc, window.start), sectionStart(doc, window.end)))
}

/**
 * The whole document with the window's sections replaced by `content` (the editor's), and the window it makes now. The sections around it
 * are the same nodes (nothing outside the window is copied)
 */
export function withWindow(doc: PMNode, window: TextWindow, content: Fragment): { doc: PMNode; window: TextWindow } {
  const before = doc.content.cut(0, sectionStart(doc, window.start))
  const after = doc.content.cut(sectionStart(doc, window.end))
  return { doc: doc.copy(before.append(content).append(after)), window: { start: window.start, end: window.start + content.childCount } }
}

/** Section `from` placed before section `to` (`to` = the number of sections: at the end). The same document when it would not move */
export function moveSection(doc: PMNode, from: number, to: number): PMNode {
  if (from < 0 || from >= doc.childCount || to < 0 || to > doc.childCount || to === from || to === from + 1) return doc
  const sections: PMNode[] = []
  doc.forEach((node) => sections.push(node))
  const [moved] = sections.splice(from, 1)
  sections.splice(to > from ? to - 1 : to, 0, moved)
  return doc.copy(Fragment.fromArray(sections))
}

/** Where section `from` ends up when it is placed before `to` (its new index) */
export const movedIndex = (from: number, to: number) => (to > from ? to - 1 : to)
