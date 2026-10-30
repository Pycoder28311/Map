// The article's text (docs/plans/36): the whole document, the window of sections the editor holds (all of them for a small text), and
// that editor once the text was clicked. Everything on the page that reads or changes the text goes through it, in positions of the
// whole document, so it works the same with or without an editor and with any window.
import { RICH_TEXT_MAX } from '@map/shared/rich-text-policy'
import { getSchema } from '@tiptap/core'
import type { Node as PMNode, Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection, TextSelection, type Selection, type Transaction } from '@tiptap/pm/state'
import type { Editor, Extensions } from '@tiptap/react'
import { useMemo, useRef, useSyncExternalStore } from 'react'
import { editorExtensions } from '../../../components/ui/editors/RichTextEditor'
import { cleanHtml, toHtml } from '../../notes/noteHtml'
import { flashBlock, goTo as goToInEditor } from '../links/linkExtensions'
import {
  htmlOf,
  isBig,
  moveSection,
  movedIndex,
  needsShift,
  parseArticle,
  sectionAt,
  sectionStart,
  wholeWindow,
  windowAround,
  windowDoc,
  withWindow,
  type TextWindow,
} from './articleDoc'
import { domFromPos, posFromDom } from './staticDom'

/** Some of the text, in positions of the whole document; `node`: the section itself is selected (not its words) */
export type TextRange = { from: number; to: number; node?: boolean }
/** Where the editor opens: a position, a selection, or the start or end of the text */
export type OpenAt = number | TextRange | 'start' | 'end'

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** A selection of `doc` at these positions, moved to the nearest place text can be selected */
function selectionIn(doc: PMNode, { from, to, node }: TextRange): Selection {
  const a = clamp(from, 0, doc.content.size)
  const b = clamp(to, 0, doc.content.size)
  if (node) {
    try {
      return NodeSelection.create(doc, a)
    } catch {
      // not a node there: a text selection
    }
  }
  return TextSelection.between(doc.resolve(a), doc.resolve(b))
}

/** The element that scrolls an element's page */
export function scrollParent(el: HTMLElement | null): HTMLElement {
  for (let at = el?.parentElement; at; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at)
    if ((overflowY === 'auto' || overflowY === 'scroll') && at.scrollHeight > at.clientHeight) return at
  }
  return document.scrollingElement as HTMLElement
}

/** The text node and offset under a point of the window (null: none there) */
export function caretPoint(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
  if (typeof doc.caretPositionFromPoint === 'function') {
    const at = doc.caretPositionFromPoint(x, y)
    return at ? { node: at.offsetNode, offset: at.offset } : null
  }
  const range = doc.caretRangeFromPoint?.(x, y)
  return range ? { node: range.startContainer, offset: range.startOffset } : null
}

export class ArticleText {
  /** The text's schema: its own until the editor comes, then the editor's (a node of one schema can't go into a document of another) */
  schema: Schema
  /** An editor's page: the text opens for editing when clicked. A reader's never does */
  readonly editable: boolean
  /** The page's element around the text (static parts and editor): set by the view */
  root: HTMLElement | null = null
  /** Told the text's HTML after every change (the page saves it) */
  onChange: (html: string) => void = () => {}

  /** The whole text at the last reset; outside the window it is always the current text */
  private base: PMNode
  /** Edited one window at a time (WINDOW in articleDoc.ts) */
  private readonly big: boolean
  /** The window in `base`'s sections (null: not opened yet) */
  private win: TextWindow | null = null
  private ed: Editor | null = null
  private version = 0
  private readonly listeners = new Set<() => void>()
  private full: { editorDoc: PMNode; base: PMNode; doc: PMNode } | null = null
  private outside: { base: PMNode; win: TextWindow; before: string; after: string } | null = null
  /** The editor waits to be loaded with the window again (after a reset): the selection it gets then, and where the caret was on screen */
  private syncing: { selection?: TextRange; anchorTop?: number } | null = null
  /** The selection the editor gets once it is there, and who waits for it */
  private opening: TextRange | null = null
  private waiting: ((editor: Editor) => void)[] = []
  private shifting = false

  constructor(html: string, schema: Schema, editable: boolean) {
    this.schema = schema
    this.editable = editable
    const content = toHtml(html)
    this.base = parseArticle(content, schema)
    this.big = isBig(this.base, content.length)
  }

  /* ───── For React (useSyncExternalStore) ───── */

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }
  readonly getVersion = () => this.version
  readonly getEditor = () => this.ed
  private emit() {
    this.version++
    for (const listener of [...this.listeners]) listener()
  }

  /** What the view draws: the text at the last reset (its static parts) and the window the editor holds */
  get view(): { base: PMNode; window: TextWindow | null } {
    return { base: this.base, window: this.win }
  }
  get editor(): Editor | null {
    return this.ed
  }

  /* ───── The text ───── */

  /** The whole text now (the same object until it changes) */
  doc(): PMNode {
    const ed = this.ed
    if (!ed || !this.win || this.syncing) return this.base
    if (this.coversAll()) return ed.state.doc
    if (this.full?.editorDoc === ed.state.doc && this.full.base === this.base) return this.full.doc
    const doc = withWindow(this.base, this.win, ed.state.doc.content).doc
    this.full = { editorDoc: ed.state.doc, base: this.base, doc }
    return doc
  }

  /** The text's HTML now (what is saved) */
  html(): string {
    const ed = this.ed
    if (!ed || !this.win || this.syncing) return htmlOf(this.base.content, this.schema)
    if (this.coversAll()) return ed.getHTML()
    if (this.outside?.base !== this.base || this.outside.win !== this.win) {
      const { base, win } = this
      this.outside = {
        base,
        win,
        before: htmlOf(base.content.cut(0, sectionStart(base, win.start)), this.schema),
        after: htmlOf(base.content.cut(sectionStart(base, win.end)), this.schema),
      }
    }
    return this.outside.before + ed.getHTML() + this.outside.after
  }

  /** The editor is open and holds the whole text (a small text, or a big one after Ctrl / ⌘ + A twice) */
  holdsAll(): boolean {
    return !!this.ed && !this.syncing && this.coversAll()
  }

  /** The window holds the whole text */
  private coversAll() {
    return !!this.win && this.win.start === 0 && this.win.end === this.base.childCount
  }

  /** Where the editor's document starts in the whole one */
  private offset() {
    return this.win ? sectionStart(this.base, this.win.start) : 0
  }

  /** The window now, in sections of the whole text */
  private currentWindow(): TextWindow | null {
    if (!this.win) return null
    return { start: this.win.start, end: this.win.start + (this.ed && !this.syncing ? this.ed.state.doc.childCount : this.win.end - this.win.start) }
  }

  /** A position of the whole text in the editor's document (null: not in the window, or no editor) */
  toEditor(pos: number): number | null {
    if (!this.ed || !this.win || this.syncing) return null
    const at = pos - this.offset()
    return at >= 0 && at <= this.ed.state.doc.content.size ? at : null
  }

  /** A position of the editor's document in the whole text */
  fromEditor(pos: number): number {
    return pos + this.offset()
  }

  /** The section a position of the whole text is in */
  sectionAt(pos: number): number {
    return sectionAt(this.doc(), pos)
  }

  /* ───── Editing ───── */

  /** The view's editor came (or went) */
  readonly attach = (editor: Editor | null) => {
    if (this.ed === editor) return
    this.ed?.off('update', this.onUpdate)
    this.ed?.off('selectionUpdate', this.onSelection)
    this.ed = editor
    this.full = null
    if (editor && editor.schema !== this.schema) {
      this.base = editor.schema.nodeFromJSON(this.base.toJSON())
      this.schema = editor.schema
    }
    if (editor) {
      editor.on('update', this.onUpdate)
      editor.on('selectionUpdate', this.onSelection)
      const selection = this.opening
      this.opening = null
      if (selection) this.place(editor, selection, false)
      this.release(editor)
    }
    this.emit()
  }

  private release(editor: Editor) {
    const waiting = this.waiting
    this.waiting = []
    for (const resolve of waiting) resolve(editor)
  }

  /** Puts the editor's selection on a range of the whole text and gives it the focus */
  private place(editor: Editor, range: TextRange, scroll: boolean) {
    const off = this.offset()
    const selection = selectionIn(editor.state.doc, { from: range.from - off, to: range.to - off, node: range.node })
    editor.view.dispatch(editor.state.tr.setSelection(selection))
    editor.commands.focus(undefined, { scrollIntoView: scroll })
  }

  private readonly onUpdate = () => {
    const ed = this.ed
    if (!ed) return
    const html = this.html()
    // Too long for the server: it would refuse the save
    if (html.length > RICH_TEXT_MAX) return void ed.commands.undo()
    this.onChange(cleanHtml(html))
    this.emit()
  }

  /** The caret near the window's edge: the window moves so the caret is in its middle again */
  private readonly onSelection = () => {
    const ed = this.ed
    const win = this.currentWindow()
    if (!ed || !win || !this.big || this.shifting || this.syncing) return
    const doc = this.doc()
    const index = win.start + ed.state.selection.$head.index(0)
    if (!needsShift(win, index, doc.childCount)) return
    this.shifting = true
    queueMicrotask(() => {
      this.shifting = false
      if (!this.ed || this.syncing) return
      const { anchor, head } = this.ed.state.selection
      const now = this.doc()
      const at = this.fromEditor(head)
      this.reset(now, windowAround(now.childCount, sectionAt(now, at)), { from: this.fromEditor(anchor), to: at, node: this.ed.state.selection instanceof NodeSelection })
    })
  }

  /** The whole text is `doc` now, the editor holds `window` of it (it is loaded again before the next paint: `sync`) */
  private reset(doc: PMNode, window: TextWindow, selection?: TextRange) {
    const caret = this.ed ? this.ed.view.coordsAtPos(this.ed.state.selection.head) : null
    this.base = doc
    this.win = window
    this.full = null
    this.syncing = { selection, anchorTop: caret?.top }
    this.emit()
  }

  /** Loads the editor with the window after a reset (the view calls it once the static parts are drawn) */
  readonly sync = () => {
    const ed = this.ed
    const syncing = this.syncing
    if (!ed || !this.win || !syncing) return
    this.syncing = null
    const doc = windowDoc(this.base, this.win)
    const off = this.offset()
    const selection = syncing.selection ? selectionIn(doc, { ...syncing.selection, from: syncing.selection.from - off, to: syncing.selection.to - off }) : undefined
    // A new state: the window's sections, the same plugins; its history starts again
    ed.view.updateState(EditorState.create({ doc, plugins: ed.state.plugins, selection }))
    // TipTap and the page's hooks hear of it through a transaction (nothing in it to undo)
    ed.view.dispatch(ed.state.tr.setMeta('addToHistory', false))
    // Nothing moves on screen: the caret stays where it was
    if (syncing.anchorTop !== undefined && selection) {
      const now = ed.view.coordsAtPos(ed.state.selection.head).top
      if (Math.abs(now - syncing.anchorTop) > 1) scrollParent(this.root).scrollTop += now - syncing.anchorTop
    }
    if (selection) ed.commands.focus(undefined, { scrollIntoView: false })
    this.full = null
    this.release(ed)
    this.emit()
  }

  /**
   * Opens the text for editing at a place (a reader's page never opens): the editor comes with the window around it, or moves its window
   * there. Answers the editor once it holds that place (null on a reader's page)
   */
  open(at: OpenAt): Promise<Editor | null> {
    if (!this.editable) return Promise.resolve(null)
    const doc = this.doc()
    const end = doc.content.size
    const range: TextRange = at === 'start' ? { from: 0, to: 0 } : at === 'end' ? { from: end, to: end } : typeof at === 'number' ? { from: at, to: at } : at
    const scroll = at === 'end'
    const ed = this.ed
    if (ed && !this.syncing) {
      if (this.toEditor(range.from) !== null && this.toEditor(range.to) !== null) {
        this.place(ed, range, scroll)
        return Promise.resolve(ed)
      }
      const promise = new Promise<Editor>((resolve) => this.waiting.push(resolve))
      this.reset(doc, windowAround(doc.childCount, sectionAt(doc, range.from)), range)
      return promise
    }
    const promise = new Promise<Editor>((resolve) => this.waiting.push(resolve))
    if (ed && this.syncing) {
      this.syncing.selection = range
      return promise
    }
    // The first click: the editor comes with this window (the view draws it), then takes the selection
    this.win = this.big ? windowAround(doc.childCount, sectionAt(doc, range.from)) : wholeWindow(doc)
    this.opening = range
    this.emit()
    return promise
  }

  /** The editor holds the whole text from now on (Ctrl / ⌘ + A a second time) */
  openAll(): Promise<Editor | null> {
    if (!this.editable) return Promise.resolve(null)
    if (this.ed && this.coversAll()) return Promise.resolve(this.ed)
    const doc = this.doc()
    if (!this.ed) {
      this.win = wholeWindow(doc)
      this.emit()
      return new Promise((resolve) => this.waiting.push(resolve))
    }
    const promise = new Promise<Editor>((resolve) => this.waiting.push(resolve))
    this.reset(doc, wholeWindow(doc), { from: 0, to: doc.content.size })
    return promise
  }

  /** Selects a section itself (its ⠿ was clicked): Delete, cut and copy take it whole */
  selectSection(index: number) {
    const doc = this.doc()
    if (index < 0 || index >= doc.childCount) return
    const from = sectionStart(doc, index)
    void this.open({ from, to: from + doc.child(index).nodeSize, node: true })
  }

  /**
   * A change of the whole text (the autolinkers, the old messages' links): through the editor when it holds all of it (it can be
   * undone), otherwise on the document itself, and the window loaded again
   */
  change(edit: (tr: Transaction) => void) {
    const ed = this.ed
    if (ed && this.coversAll() && !this.syncing) {
      const tr = ed.state.tr
      edit(tr)
      if (tr.docChanged) ed.view.dispatch(tr)
      return
    }
    const tr = EditorState.create({ doc: this.doc() }).tr
    edit(tr)
    if (!tr.docChanged) return
    this.replace(tr.doc, (pos) => tr.mapping.map(pos))
  }

  /** Section `from` placed before section `to` (the ⠿ dropped, Alt + ↑ / ↓) */
  moveSection(from: number, to: number) {
    const doc = this.doc()
    const moved = moveSection(doc, from, to)
    if (moved === doc) return
    const ed = this.ed
    const win = this.currentWindow()
    if (ed && win && !this.syncing && from >= win.start && from < win.end && to >= win.start && to <= win.end) {
      // Inside the window: one step of the editor (Ctrl + Z puts it back); the selection goes with its section
      const own = ed.state.doc
      const i = from - win.start
      const node = own.child(i)
      const fromPos = sectionStart(own, i)
      const { selection } = ed.state
      const tr = ed.state.tr.delete(fromPos, fromPos + node.nodeSize)
      const at = tr.mapping.map(sectionStart(own, to - win.start))
      tr.insert(at, node)
      if (selection.from >= fromPos && selection.to <= fromPos + node.nodeSize) {
        tr.setSelection(selectionIn(tr.doc, { from: at + selection.from - fromPos, to: at + selection.to - fromPos, node: selection instanceof NodeSelection }))
      }
      ed.view.dispatch(tr.scrollIntoView())
      return
    }
    // The moved section keeps the caret when it had it
    const start = sectionStart(moved, movedIndex(from, to))
    this.replace(moved, () => start + 1)
  }

  /** The whole text is `doc` now (changed outside the editor): the editor's window is loaded again, the page told */
  private replace(doc: PMNode, mapSelection: (pos: number) => number) {
    const ed = this.ed
    const win = this.currentWindow()
    if (ed && win) {
      const { anchor, head } = ed.state.selection
      const window = { start: Math.min(win.start, doc.childCount), end: Math.min(win.end, doc.childCount) }
      this.reset(doc, window, { from: mapSelection(this.fromEditor(anchor)), to: mapSelection(this.fromEditor(head)) })
    } else {
      this.base = doc
      this.emit()
    }
    this.onChange(cleanHtml(htmlOf(doc.content, this.schema)))
  }

  /* ───── Places on screen ───── */

  /** The element of a section: the editor's own (in the window) or the static one */
  sectionElement(index: number): HTMLElement | null {
    const win = this.currentWindow()
    if (this.ed && win && !this.syncing && index >= win.start && index < win.end) return (this.ed.view.dom.children[index - win.start] as HTMLElement | undefined) ?? null
    return this.root?.querySelector<HTMLElement>(`[data-static] > [data-section="${index}"]`) ?? null
  }

  /** The section an element of the text is in, and its top element */
  sectionOf(target: Element | null): { index: number; el: HTMLElement } | null {
    const win = this.currentWindow()
    const editorDom = this.ed?.view.dom
    for (let el = target; el && el !== this.root; el = el.parentElement) {
      if (el.parentElement === editorDom && win) return { index: win.start + [...editorDom.children].indexOf(el), el: el as HTMLElement }
      if (el.parentElement?.hasAttribute('data-static') && el instanceof HTMLElement && el.dataset.section) return { index: Number(el.dataset.section), el }
    }
    return null
  }

  /** The position of a DOM point of the text (in the editor or in a static part), or null outside the text */
  posAtDom(node: Node | null, offset: number): number | null {
    if (!node) return null
    const ed = this.ed
    if (ed && !this.syncing && ed.view.dom.contains(node)) {
      try {
        return this.fromEditor(ed.view.posAtDOM(node, offset))
      } catch {
        return null
      }
    }
    const section = this.sectionOf(node instanceof Element ? node : node.parentElement)
    if (!section || section.el.parentElement?.hasAttribute('data-static') !== true) return null
    const doc = this.doc()
    return posFromDom(doc.child(section.index), sectionStart(doc, section.index), section.el, node, offset)
  }

  /** A DOM range over a part of the static text (null: in the window, or no words there) */
  staticRange(from: number, to: number): Range | null {
    const doc = this.doc()
    const point = (pos: number) => {
      const index = sectionAt(doc, pos)
      const el = this.root?.querySelector<HTMLElement>(`[data-static] > [data-section="${index}"]`)
      return el ? domFromPos(doc.child(index), sectionStart(doc, index), el, pos) : null
    }
    const a = point(from)
    const b = point(to)
    if (!a || !b) return null
    const range = document.createRange()
    range.setStart(a.node, a.offset)
    range.setEnd(b.node, b.offset)
    return range
  }

  /** Where a position is on screen (its line), from the editor or the static text */
  rectAt(pos: number): { top: number; bottom: number; left: number } | null {
    const at = this.toEditor(pos)
    if (at !== null && this.ed) return this.ed.view.coordsAtPos(at)
    const range = this.staticRange(pos, pos)
    const rect = range?.getClientRects()[0] ?? range?.getBoundingClientRect()
    if (rect && rect.height > 0) return rect
    const el = this.sectionElement(this.sectionAt(pos))
    return el?.getBoundingClientRect() ?? null
  }

  /** Brings a place into view (Search in article) */
  scrollTo(pos: number) {
    const at = this.toEditor(pos)
    const node = at !== null && this.ed ? this.ed.view.domAtPos(at).node : this.staticRange(pos, pos)?.startContainer
    const el = node instanceof HTMLElement ? node : (node?.parentElement ?? this.sectionElement(this.sectionAt(pos)))
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  /** Selects a place of the text and brings it into view, with a short flash of its block (Contents, jumps, messages) */
  goTo(from: number, to: number) {
    const a = this.toEditor(from)
    const b = this.toEditor(to)
    if (a !== null && b !== null && this.ed) return goToInEditor(this.ed, a, b)
    const range = this.staticRange(from, to)
    if (range) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
    const block = range?.startContainer ?? this.sectionElement(this.sectionAt(from))
    if (block) flashBlock(block)
  }
}

/** The article's text for a page: made again when the page starts again (`version`: a kept draft, the server's version taken) */
export function useArticleText(version: number, html: string | undefined, extensions: Extensions, editable: boolean): ArticleText {
  // (the document is read once per start: the text is the page's while it is open)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new ArticleText(html ?? '', getSchema(editorExtensions({ extensions })), editable), [version, editable])
}

/** The text's editor (null until it is clicked), followed */
export function useTextEditor(text: ArticleText): Editor | null {
  return useSyncExternalStore(text.subscribe, text.getEditor)
}

/**
 * Something read from the whole text, read again when it changes; `equal` keeps the old value (and saves a render) when the new one is the same.
 * The same use as TipTap's useEditorState, for the whole article whatever the editor holds
 */
export function useTextState<T>(text: ArticleText, select: (doc: PMNode) => T, equal: (a: T, b: T) => boolean = Object.is): T {
  const cache = useRef<{ doc: PMNode; value: T } | null>(null)
  const read = () => {
    const doc = text.doc()
    if (cache.current?.doc === doc) return cache.current.value
    const value = select(doc)
    const same = cache.current && equal(cache.current.value, value)
    cache.current = { doc, value: same ? cache.current!.value : value }
    return cache.current.value
  }
  return useSyncExternalStore(text.subscribe, read)
}

/** Two values the same by their JSON (lists of links, of headings) */
export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
