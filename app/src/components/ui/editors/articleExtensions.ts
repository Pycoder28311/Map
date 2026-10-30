import { DOMSerializer } from '@tiptap/pm/model'
import { Extension, type Editor, type Extensions, type JSONContent } from '@tiptap/react'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { BackgroundColor, FontFamily } from '@tiptap/extension-text-style'
import { blockExtensions } from './blocks'
import { Structures } from './structures'

// What an article's text can do beyond the editor's base set (RichTextEditor): fonts, a background colour, an underline colour and kind,
// alignment, superscript / subscript, tables, a paragraph look, numbered sources and boxes of blocks (cards, rows, callouts). The server keeps exactly this markup
// (packages/shared/src/sanitize-html.ts): a new format here needs its rule there too.

/** A style attribute read from and written to the element's inline CSS (`name`: the CSS property) */
const styleAttribute = (name: string) => ({
  default: null,
  parseHTML: (element: HTMLElement) => element.style.getPropertyValue(name) || null,
  renderHTML: (attributes: Record<string, unknown>) => {
    const key = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    const value = attributes[key]
    return value ? { style: `${name}: ${value}` } : {}
  },
})

/** The underline's own colour and kind (`<u style="text-decoration-color; text-decoration-style">`: solid, double, dotted, dashed or wavy) */
const UnderlineColor = Extension.create({
  name: 'underlineColor',
  addGlobalAttributes() {
    return [{ types: ['underline'], attributes: { textDecorationColor: styleAttribute('text-decoration-color'), textDecorationStyle: styleAttribute('text-decoration-style') } }]
  },
})

/** A font weight (`font-weight: 300`) and a slant (`font-style: oblique 20deg`) on the text's span, for the toolbar's Bold and Italic dropdowns */
const FontLook = Extension.create({
  name: 'fontLook',
  addGlobalAttributes() {
    return [{ types: ['textStyle'], attributes: { fontWeight: styleAttribute('font-weight'), fontStyle: styleAttribute('font-style') } }]
  },
})

/** The look of a paragraph or heading: padding, letter gap, row gap and a border */
export const PARAGRAPH_LOOK = ['padding', 'letterSpacing', 'lineHeight', 'border'] as const
export type ParagraphLook = (typeof PARAGRAPH_LOOK)[number]

const ParagraphStyle = Extension.create({
  name: 'paragraphStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          padding: styleAttribute('padding'),
          letterSpacing: styleAttribute('letter-spacing'),
          lineHeight: styleAttribute('line-height'),
          border: styleAttribute('border'),
        },
      },
    ]
  },
})

export const articleExtensions: Extensions = [
  FontFamily,
  BackgroundColor,
  UnderlineColor,
  FontLook,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Subscript,
  Superscript,
  TableKit.configure({ table: { resizable: false } }),
  ParagraphStyle,
  // Maths structures with places to fill (the Ω box)
  Structures,
  // Cards, rows of columns, callouts (the section menu)
  ...blockExtensions,
]

/** Sets one part of the look of the paragraph or heading the caret is in (null: back to none) */
export function setParagraphLook(editor: Editor, look: ParagraphLook, value: string | null) {
  editor.chain().updateAttributes('paragraph', { [look]: value }).updateAttributes('heading', { [look]: value }).run()
}

/** The look of the block the caret is in */
export function paragraphLookOf(editor: Editor): Partial<Record<ParagraphLook, string>> {
  const type = editor.isActive('heading') ? 'heading' : 'paragraph'
  return editor.getAttributes(type) as Partial<Record<ParagraphLook, string>>
}

/** The HTML of a part of the document, as the editor would copy it */
export function htmlOf(editor: Editor, from: number, to: number): string {
  const box = document.createElement('div')
  box.append(DOMSerializer.fromSchema(editor.schema).serializeFragment(editor.state.doc.slice(from, to).content))
  return box.innerHTML
}

/**
 * The Code button: the selected text shown as its HTML code, in a fixed-width font (the words `<strong>bold</strong>` themselves, not bold
 * text). On text that is already such code, it turns it back into text from that HTML. With nothing selected it is the plain code format
 * for the words that are typed next
 */
export function showAsHtml(editor: Editor) {
  const { from, to, empty } = editor.state.selection
  if (empty) {
    editor.chain().focus().toggleCode().run()
    return
  }
  if (editor.isActive('code')) {
    const html = editor.state.doc.textBetween(from, to, '\n')
    editor.chain().focus().unsetCode().insertContentAt({ from, to }, html).run()
    return
  }
  editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, { type: 'text', text: htmlOf(editor, from, to), marks: [{ type: 'code' }] })
    .run()
}

/** The heading the sources' list follows */
export const SOURCES_TITLE = 'Sources'

/**
 * Where the sources' list is: the numbered list right after the last "Sources" heading. Pure on the document (articleExtensions.test.ts):
 * its position and how many sources it has, or null
 */
export function findSources(doc: JSONContent): { index: number; count: number } | null {
  const blocks = doc.content ?? []
  for (let i = blocks.length - 2; i >= 0; i--) {
    const heading = blocks[i]
    const text = (heading.content ?? []).map((t) => t.text ?? '').join('').trim()
    if (heading.type === 'heading' && text === SOURCES_TITLE && blocks[i + 1].type === 'orderedList') return { index: i + 1, count: blocks[i + 1].content?.length ?? 0 }
  }
  return null
}

/**
 * Adds a source: its number in superscript at the caret ("[3]"), and an empty item for it at the end of the Sources list (made, with
 * its heading, at the end of the text when there is none). The caret goes to that item, to write the source
 */
export function addSource(editor: Editor) {
  const sources = findSources(editor.getJSON())
  const number = (sources?.count ?? 0) + 1
  editor.chain().focus().insertContent({ type: 'text', text: `[${number}]`, marks: [{ type: 'superscript' }] }).unsetMark('superscript').run()

  const item = { type: 'listItem', content: [{ type: 'paragraph' }] }
  const doc = editor.state.doc
  if (sources) {
    // The end of the list: inside it, after its last item
    let listEnd = 0
    doc.forEach((node, offset, index) => {
      if (index === sources.index) listEnd = offset + node.nodeSize - 1
    })
    editor.chain().insertContentAt(listEnd, item).focus(listEnd + 2).scrollIntoView().run()
  } else {
    const end = doc.content.size
    editor
      .chain()
      .insertContentAt(end, [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: SOURCES_TITLE }] }, { type: 'orderedList', content: [item] }])
      .focus(editor.state.doc.content.size - 3)
      .scrollIntoView()
      .run()
  }
}
