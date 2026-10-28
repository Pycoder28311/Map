// Maths structures, like Word's equations (the article's Ω box): x to the y, x with y below, |x| and n!. A structure goes in with its
// places marked; the first is selected, so typing replaces it, and Tab goes to the next one (Shift+Tab back). Leaving the structure
// (Enter, Tab after the last place, or the caret going out) ends it: what stays is plain text with superscript / subscript, the markup
// the server keeps. The places live only in the editor's state. Pure helpers tested in structures.test.ts.
import { Extension, type Editor, type JSONContent } from '@tiptap/react'
import type { Mapping } from '@tiptap/pm/transform'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export type StructureKind = 'power' | 'index' | 'absolute' | 'factorial'

/** A part of a structure: fixed text, or a place (its placeholder is `text`), in superscript or subscript or neither */
export type Part = { text: string; place?: boolean; mark?: 'superscript' | 'subscript' }

export const STRUCTURES: Record<StructureKind, { label: string; parts: Part[] }> = {
  power: { label: 'Power: x to the y', parts: [{ text: 'x', place: true }, { text: 'y', place: true, mark: 'superscript' }] },
  index: { label: 'Index: x with y below', parts: [{ text: 'x', place: true }, { text: 'y', place: true, mark: 'subscript' }] },
  absolute: { label: 'Absolute value: |x|', parts: [{ text: '|' }, { text: 'x', place: true }, { text: '|' }] },
  factorial: { label: 'Factorial: n!', parts: [{ text: 'n', place: true }, { text: '!' }] },
}
export const STRUCTURE_KINDS = Object.keys(STRUCTURES) as StructureKind[]

/** The parts to write: the selected words (if any, on one line) take the first place */
export function structureParts(kind: StructureKind, selected = ''): Part[] {
  const words = selected.replace(/\s+/g, ' ').trim()
  let first = true
  return STRUCTURES[kind].parts.map((part) => {
    if (!part.place || !first) return part
    first = false
    return words ? { ...part, text: words } : part
  })
}

type Range = { from: number; to: number }
/** The structure being filled: its places, and where it ends */
export type Places = { places: Range[]; end: number }

/** The places after a change: mapped, each kept after the one before (an emptied place must not swallow the next one's words) */
export function mapPlaces(state: Places, mapping: Mapping): Places {
  const places: Range[] = []
  for (const p of state.places) {
    const before = places.at(-1)
    const from = Math.max(mapping.map(p.from, -1), before?.to ?? 0)
    places.push({ from, to: Math.max(from, mapping.map(p.to, 1)) })
  }
  return { places, end: Math.max(mapping.map(state.end, 1), places.at(-1)?.to ?? 0) }
}

/** The place to go to from the caret: the next one (dir 1) or the one before (-1); null: past the last (or before the first) */
export function nextPlace(places: Range[], pos: number, dir: 1 | -1): number | null {
  // The place the caret is in, or the last one starting before it
  let at = -1
  places.forEach((p, i) => {
    if (p.from <= pos) at = i
  })
  const next = at + dir
  return next >= 0 && next < places.length ? next : null
}

export const placesKey = new PluginKey<Places | null>('articleStructures')

/** Writes a structure at the caret (over the selection, which fills its first place) and selects its first place */
export function insertStructure(editor: Editor, kind: StructureKind) {
  const { from, to } = editor.state.selection
  const parts = structureParts(kind, editor.state.doc.textBetween(from, to, ' '))
  const content: JSONContent[] = parts.map((p) => ({ type: 'text', text: p.text, ...(p.mark ? { marks: [{ type: p.mark }] } : {}) }))
  editor.chain().focus().insertContentAt({ from, to }, content).run()
  let pos = from
  const places: Range[] = []
  for (const p of parts) {
    if (p.place) places.push({ from: pos, to: pos + p.text.length })
    pos += p.text.length
  }
  const { tr } = editor.state
  tr.setMeta(placesKey, { places, end: pos })
  tr.setSelection(TextSelection.create(tr.doc, places[0].from, places[0].to))
  // Typing goes on without the structure's last mark
  tr.setStoredMarks(null)
  editor.view.dispatch(tr)
}

/** Ends the structure being filled: the caret goes after it */
function leave(editor: Editor, state: Places) {
  const end = Math.min(state.end, editor.state.doc.content.size)
  const tr = editor.state.tr.setMeta(placesKey, null).setSelection(TextSelection.create(editor.state.doc, end))
  // After a superscript or subscript the text goes on plain
  tr.setStoredMarks([])
  editor.view.dispatch(tr)
  return true
}

/** Selects a place (Tab, Shift+Tab); past the last one ends the structure */
function step(editor: Editor, dir: 1 | -1) {
  const state = placesKey.getState(editor.state)
  if (!state) return false
  const index = nextPlace(state.places, editor.state.selection.from, dir)
  if (index === null) return dir === 1 ? leave(editor, state) : true
  const place = state.places[index]
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, place.from, place.to)))
  return true
}

export const Structures = Extension.create({
  name: 'structures',
  // Before the lists' Tab (sink / lift an item)
  priority: 1100,
  addProseMirrorPlugins() {
    return [
      new Plugin<Places | null>({
        key: placesKey,
        state: {
          init: () => null,
          apply: (tr, value) => {
            const meta = tr.getMeta(placesKey) as Places | null | undefined
            if (meta !== undefined) return meta
            if (!value) return null
            const next = tr.docChanged ? mapPlaces(value, tr.mapping) : value
            // The caret went out of the structure: it is done
            const { from, to } = tr.selection
            const start = next.places[0]?.from ?? 0
            return from < start || to > next.end ? null : next
          },
        },
        props: {
          decorations(state) {
            const places = placesKey.getState(state)
            if (!places) return null
            return DecorationSet.create(
              state.doc,
              places.places.map((p) =>
                p.from === p.to
                  ? Decoration.widget(p.from, () => Object.assign(document.createElement('span'), { className: 'article-place article-place-empty' }), { side: -1 })
                  : Decoration.inline(p.from, p.to, { class: 'article-place' }),
              ),
            )
          },
        },
      }),
    ]
  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => step(editor as Editor, 1),
      'Shift-Tab': ({ editor }) => step(editor as Editor, -1),
      Enter: ({ editor }) => {
        const state = placesKey.getState(editor.state)
        return state ? leave(editor as Editor, state) : false
      },
    }
  },
})
