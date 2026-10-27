import { Extension, type Editor, type Extensions, type JSONContent } from '@tiptap/react'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { BackgroundColor, FontFamily } from '@tiptap/extension-text-style'

// What an article's text can do beyond the editor's base set (RichTextEditor): fonts, a background colour, an underline colour,
// alignment, superscript / subscript, tables, a paragraph look and numbered sources. The server keeps exactly this markup
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

/** The underline's own colour (`<u style="text-decoration-color">`) */
const UnderlineColor = Extension.create({
  name: 'underlineColor',
  addGlobalAttributes() {
    return [{ types: ['underline'], attributes: { textDecorationColor: styleAttribute('text-decoration-color') } }]
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
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Subscript,
  Superscript,
  TableKit.configure({ table: { resizable: false } }),
  ParagraphStyle,
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

/** Adds a section at the end of the text: a heading and an empty paragraph, the caret in the heading */
export function addSection(editor: Editor) {
  const end = editor.state.doc.content.size
  editor
    .chain()
    .insertContentAt(end, [{ type: 'heading', attrs: { level: 2 } }, { type: 'paragraph' }])
    .focus(end + 1)
    .scrollIntoView()
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
