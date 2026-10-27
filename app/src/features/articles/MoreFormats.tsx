import { useEditorState, type Editor } from '@tiptap/react'
import { LuAArrowDown, LuAArrowUp, LuCode, LuQuote, LuRemoveFormatting, LuStrikethrough, LuSubscript, LuSuperscript } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { addSource, paragraphLookOf, setParagraphLook } from '../../components/ui/editors/articleExtensions'
import ColourField from '../../components/ui/fields/ColourField'
import RangeField from '../../components/ui/fields/RangeField'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'

/** The sizes Bigger and Smaller step through (px); the editor's own size is 16 */
const STEPS = [10, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48]
const NORMAL = 16

/** The next size up (+1) or down (-1) from the current one */
function stepSize(current: string, direction: 1 | -1): number {
  const px = parseFloat(current) || NORMAL
  return direction === 1 ? (STEPS.find((s) => s > px) ?? STEPS.at(-1)!) : ([...STEPS].reverse().find((s) => s < px) ?? STEPS[0])
}

const setSize = (editor: Editor, px: number) =>
  px === NORMAL ? editor.chain().focus().unsetFontSize().run() : editor.chain().focus().setFontSize(`${px}px`).run()

type Format = { label: string; icon: PlainIcon; mark?: string; run: (editor: Editor, size: string) => void }

const FORMATS: Format[] = [
  { label: 'Bigger', icon: LuAArrowUp, run: (e, size) => setSize(e, stepSize(size, 1)) },
  { label: 'Smaller', icon: LuAArrowDown, run: (e, size) => setSize(e, stepSize(size, -1)) },
  { label: 'Superscript', icon: LuSuperscript, mark: 'superscript', run: (e) => e.chain().focus().toggleSuperscript().run() },
  { label: 'Subscript', icon: LuSubscript, mark: 'subscript', run: (e) => e.chain().focus().toggleSubscript().run() },
  { label: 'Code', icon: LuCode, mark: 'code', run: (e) => e.chain().focus().toggleCode().run() },
  { label: 'Strikethrough', icon: LuStrikethrough, mark: 'strike', run: (e) => e.chain().focus().toggleStrike().run() },
  { label: 'Add source', icon: LuQuote, run: (e) => addSource(e) },
  { label: 'Clear formatting', icon: LuRemoveFormatting, run: (e) => e.chain().focus().unsetAllMarks().run() },
]

const BORDER = /^(\d+)px solid (.+)$/
const BORDER_COLOUR = '#9ca3af'

/**
 * The article toolbar's More popout: the rarer formats (bigger / smaller, superscript / subscript, code, strikethrough, a numbered
 * source, clear) and the look of the paragraph the caret is in (padding, letter gap, row gap, border). Changes apply at once.
 */
export default function MoreFormats({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: FORMATS.filter((f) => f.mark && e.isActive(f.mark)).map((f) => f.mark),
      size: (e.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      look: paragraphLookOf(e),
    }),
  })
  const look = state.look
  const border = BORDER.exec(look.border ?? '')
  const borderWidth = border ? Number(border[1]) : 0
  const borderColour = border?.[2] ?? BORDER_COLOUR
  const setBorder = (width: number, colour: string) => setParagraphLook(editor, 'border', width > 0 ? `${width}px solid ${colour}` : null)

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="More formats" className="grid grid-cols-4 gap-1">
        {FORMATS.map((f) => {
          const active = f.mark ? state.active.includes(f.mark) : undefined
          return (
            <IconButton
              key={f.label}
              icon={f.icon}
              label={f.label}
              variant={active ? 'selected' : 'ghost'}
              aria-pressed={active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => f.run(editor, state.size)}
            />
          )
        })}
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-2">
        <p className="text-small font-medium text-fg-muted">Paragraph</p>
        <RangeField
          label="Padding"
          value={parseFloat(look.padding ?? '') || 0}
          min={0}
          max={48}
          suffix="px"
          onLive={(v) => setParagraphLook(editor, 'padding', v ? `${v}px` : null)}
          onCommit={(v) => setParagraphLook(editor, 'padding', v ? `${v}px` : null)}
        />
        <RangeField
          label="Letter gap"
          value={parseFloat(look.letterSpacing ?? '') || 0}
          min={-2}
          max={10}
          step={0.5}
          suffix="px"
          onLive={(v) => setParagraphLook(editor, 'letterSpacing', v ? `${v.toFixed(1)}px` : null)}
          onCommit={(v) => setParagraphLook(editor, 'letterSpacing', v ? `${v.toFixed(1)}px` : null)}
        />
        <RangeField
          label="Row gap"
          value={parseFloat(look.lineHeight ?? '') || 1.5}
          min={1}
          max={3}
          step={0.1}
          onLive={(v) => setParagraphLook(editor, 'lineHeight', v.toFixed(1))}
          onCommit={(v) => setParagraphLook(editor, 'lineHeight', v.toFixed(1))}
        />
        <div className="flex items-end gap-2">
          <RangeField
            label="Border"
            value={borderWidth}
            min={0}
            max={8}
            suffix="px"
            className="flex-1"
            onLive={(v) => setBorder(v, borderColour)}
            onCommit={(v) => setBorder(v, borderColour)}
          />
          <ColourField
            label="Border colour"
            value={borderColour}
            onLive={(hex) => setBorder(Math.max(borderWidth, 1), hex)}
            onCommit={(hex) => setBorder(Math.max(borderWidth, 1), hex)}
          />
        </div>
      </div>
    </div>
  )
}
