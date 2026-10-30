// The article's links in its editor: clicks on them (they never navigate: the page decides what a click does), the autolinker that
// links what is typed, the highlights of Search in article, and the commands that write a link.
import { Extension, type Editor, type Extensions } from '@tiptap/react'
import { Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state'
import { AddMarkStep, RemoveMarkStep } from '@tiptap/pm/transform'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { RefObject } from 'react'
import { applyRule, longestFirst, type AutoRule } from './autolink'
import { linkAt, type LinkRange } from './docLinks'
import { findMatches } from './find'
import { fromHref, LINK_PREFIX, toHref, type ArticleLink } from './linkHref'

/** What the page does when something happens in the text */
export type LinkHandlers = {
  /** One of our links was clicked: `el` is its element (to place something by it) */
  onOpen: (link: ArticleLink, range: LinkRange, el: HTMLElement) => void
  /** Ctrl / ⌘ + F in the text */
  onFind: () => void
  /** The article's autolinkers now (its `autolinkers` field: the page holds them) */
  rules: () => AutoRule[]
}

/** A transaction that writes links itself (the toolbar's buttons, the autolinker's list): the autolinker leaves it alone */
export const LINK_EDIT = 'articleLinkEdit'

const clicks = (handlers: RefObject<LinkHandlers>) =>
  Extension.create({
    name: 'articleLinkClicks',
    // Before the Link mark's own click handler (1000), which would open the href in a new tab
    priority: 1100,
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('articleLinkClicks'),
          props: {
            handleClick: (view, pos, event) => {
              if (event.button !== 0) return false
              const el = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a')
              const href = el?.getAttribute('href')
              if (!el || !view.dom.contains(el) || !href?.startsWith(LINK_PREFIX)) return false
              // The caret goes where the click was, as for any text; then the page acts on the link
              view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos))))
              const range = linkAt(view.state.doc, pos)
              const link = fromHref(href)
              if (link && range) handlers.current.onOpen(link, range, el)
              return true
            },
          },
        }),
      ]
    },
    addKeyboardShortcuts() {
      return {
        'Mod-f': () => {
          handlers.current.onFind()
          return true
        },
      }
    },
  })

/** A transaction that only adds or takes away marks (no words changed) */
const onlyMarks = (tr: Transaction) => tr.steps.every((step) => step instanceof AddMarkStep || step instanceof RemoveMarkStep)

/**
 * Links what is typed: after a change, the page's autolinkers (the article's `autolinkers` field, autolink.ts) link their words in the changed part. The word the caret
 * is still typing waits until the caret leaves it. Not undone on its own (it is part of the typing), and never after a link was written
 * or taken away by hand (a word unlinked on purpose stays so)
 */
const Autolinker = (handlers: RefObject<LinkHandlers>) => Extension.create({
  name: 'articleAutolinker',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('articleAutolinker'),
        appendTransaction: (trs, before, state) => {
          if (trs.some((tr) => tr.getMeta(LINK_EDIT) || tr.getMeta('articleAutolinker'))) return null
          const changed = trs.some((tr) => tr.docChanged)
          let within: { from: number; to: number }[]
          if (changed) {
            if (trs.every((tr) => !tr.docChanged || onlyMarks(tr))) return null
            const start = state.doc.content.findDiffStart(before.doc.content)
            const ends = state.doc.content.findDiffEnd(before.doc.content)
            if (start === null || !ends) return null
            within = [{ from: Math.max(0, start - 1), to: Math.max(start, ends.a) + 1 }]
          } else if (before.selection.empty && !state.selection.eq(before.selection)) {
            // The caret left a word: it can be linked now
            within = [{ from: Math.max(0, before.selection.from - 1), to: before.selection.from }]
          } else return null
          const rules = handlers.current.rules()
          if (rules.length === 0) return null
          const tr = state.tr
          const skipAt = state.selection.empty ? state.selection.from : undefined
          let linked = 0
          for (const rule of rules) for (const text of longestFirst(rule.phrases)) linked += applyRule(tr, { id: rule.id, text, link: rule.link }, { within, skipAt })
          if (!linked) return null
          // With typing it is undone with the typing (history joins an appended transaction to its own); after a caret move, never
          if (!changed) tr.setMeta('addToHistory', false)
          return tr.setMeta('articleAutolinker', true)
        },
      }),
    ]
  },
})

/** Search in article: the query, which match is the current one, and where they all are */
type FindState = { query: string; current: number; matches: { from: number; to: number }[] }
export const findKey = new PluginKey<FindState>('articleFind')

const FindHighlight = Extension.create({
  name: 'articleFind',
  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => ({ query: '', current: 0, matches: [] }),
          apply: (tr, value, _old, state) => {
            const meta = tr.getMeta(findKey) as Partial<Pick<FindState, 'query' | 'current'>> | undefined
            if (!meta && !tr.docChanged) return value
            const query = meta?.query ?? value.query
            const matches = findMatches(state.doc, query)
            const current = matches.length === 0 ? 0 : Math.min(Math.max(meta?.current ?? value.current, 0), matches.length - 1)
            return { query, current, matches }
          },
        },
        props: {
          decorations(state) {
            const find = findKey.getState(state)
            if (!find?.matches.length) return null
            return DecorationSet.create(
              state.doc,
              find.matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === find.current ? 'article-find article-find-current' : 'article-find' })),
            )
          },
        },
      }),
    ]
  },
})

/** The article's link extensions, talking to the page through `handlers` (read when something happens, so they can change) */
export function linkExtensions(handlers: RefObject<LinkHandlers>): Extensions {
  return [clicks(handlers), Autolinker(handlers), FindHighlight]
}

/** The link the caret or the selection is on, if it is one of ours */
export function currentLink(editor: Editor): ArticleLink | null {
  return fromHref(editor.getAttributes('link').href as string | undefined)
}

/**
 * Makes the selection (or the link the caret is in) this link. `text`: the words it shows instead of the selected ones (Real link's
 * Name); left out, the words stay
 */
export function setArticleLink(editor: Editor, link: ArticleLink, text?: string) {
  const href = toHref(link)
  const { from, to, empty } = editor.state.selection
  const chain = editor.chain().focus()
  if (text !== undefined && text.trim() && !empty && text !== editor.state.doc.textBetween(from, to)) {
    chain.insertContentAt({ from, to }, { type: 'text', text, marks: [{ type: 'link', attrs: { href } }] })
  } else chain.extendMarkRange('link').setLink({ href })
  chain.setMeta(LINK_EDIT, true).run()
}

/** Takes away the link the caret or the selection is on (its words stay) */
export function removeArticleLink(editor: Editor) {
  editor.chain().focus().extendMarkRange('link').unsetLink().setMeta(LINK_EDIT, true).run()
}

/** Selects a place of the text and brings it into view, with a short flash of its block */
export function goTo(editor: Editor, from: number, to: number) {
  editor.chain().focus().setTextSelection({ from, to }).setMeta(LINK_EDIT, true).run()
  const dom = editor.view.domAtPos(from).node
  const block = (dom instanceof HTMLElement ? dom : dom.parentElement)?.closest<HTMLElement>('p, h1, h2, h3, h4, h5, h6, li, td, th')
  if (!block) return
  block.scrollIntoView({ block: 'center', behavior: 'smooth' })
  block.classList.remove('article-flash')
  // Started again when it was still flashing
  void block.offsetWidth
  block.classList.add('article-flash')
  window.setTimeout(() => block.classList.remove('article-flash'), 1200)
}
