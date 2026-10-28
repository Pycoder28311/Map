import { useEditorState, type Editor } from '@tiptap/react'
import { LuSubscript, LuSuperscript } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import SymbolSections from './SymbolPanel'
import { SYMBOLS } from './symbols'

type Format = { label: string; icon: PlainIcon; mark: string; run: (editor: Editor) => void }

/** The formats, in sections: the power up and the index below */
const SECTIONS: { title: string; formats: Format[] }[] = [
  {
    title: 'Position',
    formats: [
      { label: 'Superscript', icon: LuSuperscript, mark: 'superscript', run: (e) => e.chain().focus().toggleSuperscript().run() },
      { label: 'Subscript', icon: LuSubscript, mark: 'subscript', run: (e) => e.chain().focus().toggleSubscript().run() },
    ],
  },
]
const FORMATS = SECTIONS.flatMap((section) => section.formats)

/**
 * The popout of the article toolbar's Ω button: the power up and the index below (superscript and subscript), and the strange characters
 * (marks, quotes, arrows, currency, fractions, letters, maths, shapes) to put in the text, in sections. The most common characters show in the toolbar's row.
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
      {SECTIONS.map((section) => (
        <section key={section.title} role="group" aria-label={section.title}>
          <h3 className="px-1 pb-0.5 text-small text-fg-subtle">{section.title}</h3>
          <div className="flex flex-wrap gap-0.5">
            {section.formats.map((f) => {
              const active = state.active.includes(f.mark)
              return (
                <IconButton
                  key={f.label}
                  icon={f.icon}
                  label={f.label}
                  size="sm"
                  variant={active ? 'selected' : 'ghost'}
                  aria-pressed={active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => f.run(editor)}
                />
              )
            })}
          </div>
        </section>
      ))}
      <SymbolSections editor={editor} sections={SYMBOLS} />
    </div>
  )
}
