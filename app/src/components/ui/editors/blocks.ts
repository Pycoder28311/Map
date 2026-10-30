// The article's boxes of blocks (docs/plans/36): a card, a row of columns side by side, and a callout with a tone. Written as
// `<div data-type="…">`, the only `div`s the server keeps besides the checklist's (packages/shared/src/sanitize-html.ts: a change of the
// markup here needs its rule there). Their look is styles/articleBlocks.css, read from the same attributes, so the static text looks the same.
import { mergeAttributes, Node, type Editor } from '@tiptap/core'

/** The tones a callout can have, in the order the section menu offers them */
export const CALLOUT_TONES = ['note', 'tip', 'warning'] as const
export type CalloutTone = (typeof CALLOUT_TONES)[number]

/** Backspace at the very start of a box's first row takes that row out of the box (an empty box goes) */
function liftOutOf(editor: Editor, name: string): boolean {
  const { $from, empty } = editor.state.selection
  if (!empty || $from.parentOffset !== 0) return false
  const box = $from.node(-1)
  if (box?.type.name !== name || $from.index(-1) !== 0) return false
  return editor.commands.lift(name)
}

/** A bordered box of blocks (Card, and a card inside each column of a Card row) */
export const Card = Node.create({
  name: 'card',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML: () => [{ tag: 'div[data-type="card"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'card' }), 0],
  addKeyboardShortcuts() {
    return { Backspace: () => liftOutOf(this.editor, this.name) }
  },
})

/** Columns side by side (2 or 3); they go one under the other when the text is too narrow for them */
export const Row = Node.create({
  name: 'row',
  group: 'block',
  content: 'column{2,3}',
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="row"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'row' }), 0],
})

/** One column of a row: blocks, or a card */
export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="column"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column' }), 0],
})

/** A tinted box that says something beside the text: a note, a tip or a warning */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      tone: {
        default: 'note' satisfies CalloutTone,
        parseHTML: (el) => {
          const tone = el.getAttribute('data-tone')
          return (CALLOUT_TONES as readonly string[]).includes(tone ?? '') ? tone : 'note'
        },
        renderHTML: (attrs) => ({ 'data-tone': attrs.tone as string }),
      },
    }
  },
  parseHTML: () => [{ tag: 'div[data-type="callout"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0],
  addKeyboardShortcuts() {
    return { Backspace: () => liftOutOf(this.editor, this.name) }
  },
})

export const blockExtensions = [Card, Row, Column, Callout]
