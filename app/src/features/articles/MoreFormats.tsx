import { useEditorState, type Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { LuSubscript, LuSuperscript } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import { insertStructure, STRUCTURE_KINDS, STRUCTURES } from '../../components/ui/editors/structures'
import StructureIcon from './StructureIcon'
import SymbolSections from './SymbolPanel'
import { SYMBOL_GROUPS } from './symbols'

type Format = { label: string; icon: PlainIcon; mark: string; run: (editor: Editor) => void }

/** The power up and the index below, as formats of the selected text */
const FORMATS: Format[] = [
  { label: 'Superscript', icon: LuSuperscript, mark: 'superscript', run: (e) => e.chain().focus().toggleSuperscript().run() },
  { label: 'Subscript', icon: LuSubscript, mark: 'subscript', run: (e) => e.chain().focus().toggleSubscript().run() },
]

/** A group of the popout: its name over its content, a line above it (but the first) */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1 border-t border-line pt-2 first:border-t-0 first:pt-0">
      <h3 className="px-1 text-small font-medium text-fg-muted">{title}</h3>
      {children}
    </section>
  )
}

/**
 * The popout of the article toolbar's Ω box, in four groups: Basics (the structures, like Word's equations: x to the y, x with y below,
 * |x|, n!, with places to fill and Tab between them; and superscript / subscript), SVGs (shapes, signs and arrows, big), Mathematical and
 * Others (characters, in sections)
 */
export default function MoreFormats({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: FORMATS.filter((f) => e.isActive(f.mark)).map((f) => f.mark),
    }),
  })
  return (
    <div className="flex max-h-96 flex-col gap-2 overflow-y-auto overscroll-contain">
      <Group title="Basics">
        <div className="flex flex-wrap gap-0.5">
          {STRUCTURE_KINDS.map((kind) => (
            <IconButton key={kind} label={STRUCTURES[kind].label} onMouseDown={(e) => e.preventDefault()} onClick={() => insertStructure(editor, kind)}>
              <StructureIcon kind={kind} />
            </IconButton>
          ))}
          <span aria-hidden className="mx-1 w-px self-stretch bg-line" />
          {FORMATS.map((f) => {
            const active = state.active.includes(f.mark)
            return (
              <IconButton
                key={f.label}
                icon={f.icon}
                label={f.label}
                variant={active ? 'selected' : 'ghost'}
                aria-pressed={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => f.run(editor)}
              />
            )
          })}
        </div>
      </Group>
      {SYMBOL_GROUPS.map((group) => (
        <Group key={group.title} title={group.title}>
          <SymbolSections editor={editor} sections={group.sections} big={group.big} />
        </Group>
      ))}
    </div>
  )
}
