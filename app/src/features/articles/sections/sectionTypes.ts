// The kinds of section an article can get (docs/plans/36): one list, shown in groups by the toolbar's Add section, by typing `/` in the
// text and by the button under its last row. A kind either adds blocks at the caret (`content`) or does something of its own (`run`).
import { Selection } from '@tiptap/pm/state'
import type { Editor, JSONContent } from '@tiptap/react'
import {
  LuCodeXml,
  LuColumns2,
  LuColumns3,
  LuGalleryHorizontal,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuInfo,
  LuLayoutList,
  LuLibrary,
  LuLightbulb,
  LuList,
  LuListChecks,
  LuListOrdered,
  LuMinus,
  LuPilcrow,
  LuSquare,
  LuTable,
  LuTextQuote,
  LuTriangleAlert,
} from 'react-icons/lu'
import { addSource } from '../../../components/ui/editors/articleExtensions'
import type { CalloutTone } from '../../../components/ui/editors/blocks'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import { fold } from '../../search/search'

/** The menu's groups, in their order */
export const SECTION_GROUPS = ['Text', 'Paragraph kinds', 'Lists', 'Cards', 'Rows', 'Media and data', 'Article'] as const
export type SectionGroup = (typeof SECTION_GROUPS)[number]

/** What a kind may need from the place that adds it */
export type SectionContext = {
  /** Opens the picture picker (its files go in at the caret) */
  pickImage: () => void
}

export type SectionType = {
  id: string
  label: string
  group: SectionGroup
  icon: PlainIcon
  /** Other words it is found by in the menu's filter */
  keywords?: string[]
  /** The blocks it adds; the caret goes into the first row of them */
  content?: () => JSONContent[]
  /** Only at the top of the text (a row of columns), never inside a list or a box */
  topLevel?: boolean
  /** What it does instead of adding blocks */
  run?: (editor: Editor, context: SectionContext) => void
}

const paragraph = (): JSONContent => ({ type: 'paragraph' })
const heading = (level: number): JSONContent => ({ type: 'heading', attrs: { level } })
const list = (type: string, item = 'listItem', attrs?: Record<string, unknown>): JSONContent => ({ type, content: [{ type: item, ...(attrs ? { attrs } : {}), content: [paragraph()] }] })
const callout = (tone: CalloutTone): JSONContent => ({ type: 'callout', attrs: { tone }, content: [paragraph()] })
const card = (): JSONContent => ({ type: 'card', content: [paragraph()] })
/** A row of `count` columns, each with a card (`cards`) or a paragraph */
const row = (count: number, cards: boolean): JSONContent => ({
  type: 'row',
  content: Array.from({ length: count }, () => ({ type: 'column', content: [cards ? card() : paragraph()] })),
})

export const SECTION_TYPES: SectionType[] = [
  { id: 'paragraph', label: 'Paragraph', group: 'Text', icon: LuPilcrow, keywords: ['text', 'p'], content: () => [paragraph()] },
  { id: 'h1', label: 'Heading 1', group: 'Text', icon: LuHeading1, keywords: ['title', 'h1'], content: () => [heading(1)] },
  { id: 'h2', label: 'Heading 2', group: 'Text', icon: LuHeading2, keywords: ['subtitle', 'h2'], content: () => [heading(2)] },
  { id: 'h3', label: 'Heading 3', group: 'Text', icon: LuHeading3, keywords: ['h3'], content: () => [heading(3)] },
  { id: 'section', label: 'Section', group: 'Text', icon: LuLayoutList, keywords: ['heading', 'chapter'], content: () => [heading(2), paragraph()] },
  { id: 'quote', label: 'Quote', group: 'Paragraph kinds', icon: LuTextQuote, keywords: ['blockquote', 'cite'], content: () => [{ type: 'blockquote', content: [paragraph()] }] },
  { id: 'callout-note', label: 'Callout: note', group: 'Paragraph kinds', icon: LuInfo, keywords: ['box', 'aside'], content: () => [callout('note')] },
  { id: 'callout-tip', label: 'Callout: tip', group: 'Paragraph kinds', icon: LuLightbulb, keywords: ['box', 'hint', 'idea'], content: () => [callout('tip')] },
  { id: 'callout-warning', label: 'Callout: warning', group: 'Paragraph kinds', icon: LuTriangleAlert, keywords: ['box', 'danger', 'caution'], content: () => [callout('warning')] },
  { id: 'code', label: 'Code block', group: 'Paragraph kinds', icon: LuCodeXml, keywords: ['pre', 'monospace'], content: () => [{ type: 'codeBlock' }] },
  { id: 'bullets', label: 'Bulleted list', group: 'Lists', icon: LuList, keywords: ['ul', 'unordered'], content: () => [list('bulletList')] },
  { id: 'numbers', label: 'Numbered list', group: 'Lists', icon: LuListOrdered, keywords: ['ol', 'ordered'], content: () => [list('orderedList')] },
  { id: 'checklist', label: 'Checklist', group: 'Lists', icon: LuListChecks, keywords: ['todo', 'task'], content: () => [list('taskList', 'taskItem', { checked: false })] },
  { id: 'card', label: 'Card', group: 'Cards', icon: LuSquare, keywords: ['box'], content: () => [card()] },
  { id: 'cards-2', label: 'Card row (2)', group: 'Cards', icon: LuGalleryHorizontal, keywords: ['cards', 'side by side'], topLevel: true, content: () => [row(2, true)] },
  { id: 'cards-3', label: 'Card row (3)', group: 'Cards', icon: LuGalleryHorizontal, keywords: ['cards', 'side by side'], topLevel: true, content: () => [row(3, true)] },
  { id: 'columns-2', label: 'Two columns', group: 'Rows', icon: LuColumns2, keywords: ['row', 'side by side'], topLevel: true, content: () => [row(2, false)] },
  { id: 'columns-3', label: 'Three columns', group: 'Rows', icon: LuColumns3, keywords: ['row', 'side by side'], topLevel: true, content: () => [row(3, false)] },
  { id: 'divider', label: 'Divider', group: 'Rows', icon: LuMinus, keywords: ['line', 'rule', 'hr'], content: () => [{ type: 'horizontalRule' }, paragraph()] },
  { id: 'image', label: 'Image', group: 'Media and data', icon: LuImage, keywords: ['picture', 'photo'], run: (_editor, context) => context.pickImage() },
  { id: 'table', label: 'Table', group: 'Media and data', icon: LuTable, keywords: ['grid'], run: (editor) => void editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: 'sources', label: 'Sources', group: 'Article', icon: LuLibrary, keywords: ['references', 'citation', 'footnote'], run: (editor) => addSource(editor) },
]

/** The kinds a menu's filter keeps (its words in the label or the keywords, any case or accents), in the list's order */
export function filterSections(query: string, types: SectionType[] = SECTION_TYPES): SectionType[] {
  const needle = fold(query.trim())
  if (!needle) return types
  return types.filter((t) => [t.label, t.group, ...(t.keywords ?? [])].some((word) => fold(word).includes(needle)))
}

/** The kinds in their groups (groups with none left out) */
export function groupSections(types: SectionType[]): { group: SectionGroup; types: SectionType[] }[] {
  return SECTION_GROUPS.map((group) => ({ group, types: types.filter((t) => t.group === group) })).filter((g) => g.types.length > 0)
}

/**
 * Adds a section of this kind at the caret: in place of the row the caret is in when that row is empty, otherwise after the caret's
 * section; then the caret goes into it. `typed`: the `/` and its query, taken out first
 */
export function placeSection(editor: Editor, type: SectionType, context: SectionContext, typed?: { from: number; to: number }) {
  if (typed) editor.chain().focus().deleteRange(typed).run()
  if (type.run) return type.run(editor, context)
  if (!type.content) return
  const { $from } = editor.state.selection
  const row = $from.parent
  const empty = row.type.name === 'paragraph' && row.content.size === 0
  let range: { from: number; to: number }
  if ($from.depth === 0) range = { from: editor.state.selection.to, to: editor.state.selection.to }
  else if (empty && ($from.depth === 1 || !type.topLevel)) range = { from: $from.before(), to: $from.after() }
  else range = { from: $from.after(1), to: $from.after(1) }
  editor.chain().focus().insertContentAt(range, type.content()).run()
  const into = Selection.findFrom(editor.state.doc.resolve(Math.min(range.from, editor.state.doc.content.size)), 1, true)
  if (into) editor.view.dispatch(editor.state.tr.setSelection(into).scrollIntoView())
}
