import type { Editor } from '@tiptap/react'
import { useState, type ReactNode } from 'react'
import { LuAlignLeft, LuChevronDown, LuCode, LuLink, LuList, LuPlus, LuRedo2, LuUndo2 } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import { showAsHtml } from '../../../components/ui/editors/articleExtensions'
import { idleEditor } from '../../../components/ui/editors/idleEditor'
import { useImagePicker } from '../../../components/ui/editors/useImagePicker'
import HoverInfo, { TIP_DELAY } from '../../../components/ui/overlays/HoverInfo'
import { keepFocus } from '../../../lib/keepFocus'
import AddSectionPopover from '../sections/AddSectionPopover'
import type { SectionType } from '../sections/sectionTypes'
import ColourButtons from './ColourButtons'
import InsertMenu from './InsertMenu'
import LinkPopover from './LinkPopover'
import OmegaBox from './omega/OmegaBox'
import ParagraphLook from './ParagraphLook'
import { Group, Idle, Separator, TextButton, ToolButton } from './parts'
import { BoldControl, ItalicControl } from './StyleSplit'
import { FontSelect, SizeControl } from './TextControls'
import { pickList } from './toolbarCommands'
import { ALIGNS, FONT_SIZES, LISTS, type Align, type ListKind } from './toolbarConfig'
import ToolbarDropdown from './ToolbarDropdown'
import { useToolbarLevel } from './toolbarLevel'
import { TOOLBAR_TIPS } from './toolbarTexts'
import UnderlineControl from './UnderlineControl'
import { useToolbarState } from './useToolbarState'

type Props = {
  /** The text's editor; null until the text is clicked: the bar is drawn the same, its buttons disabled (but Add section) */
  editor: Editor | null
  /** Stores a picture and answers its address (Insert ▸ Image) */
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
  /** Whether the second row shows (More, at the first row's right end): the page holds it */
  secondRow: boolean
  onSecondRowChange: (shown: boolean) => void
  /** Add section's menu picked a kind (the page adds it at the caret, opening the text first when it is not open yet) */
  onSection: (type: SectionType) => void
  /** Link types (row 2, right of the Ω, while nothing is selected): whether it shows the links row now, and its press */
  linkTypes: { shown: boolean; onToggle: () => void }
  /** The links row (LinkRow): its own box under the bar, a small gap away, floating over the text so it never pushes it down */
  linkRow?: ReactNode
}

/**
 * The article's toolbar, a row of buttons that drive its editor (`editor`, from the text field's onEditor): undo / redo,
 * the text (font and size, as the map's text sidebar has them, bold, italic, underline with a dropdown of its kind and colour, the text colour as a coloured A and the background colour), lists, the alignments one next to the other,
 * next to the alignments with no space: Media (an image icon and its name; it opens the image, table and divider choice) and Link (a link icon and its name) together, with no gap and a line before them.
 * Its controls are in this folder; this file only lays out its two rows (which control goes where at each level: toolbarLevel.ts).
 */
export default function ArticleToolbar({ editor: own, onUploadImage, onUploadError, secondRow, onSecondRowChange, onSection, linkTypes, linkRow }: Props) {
  // Before the text is opened the buttons read an editor of their own (and are disabled)
  const idle = !own
  const editor = own ?? idleEditor()
  const state = useToolbarState(editor)
  // The Ω popout and the Add section menu (both in row 2)
  const [more, setMore] = useState(false)
  const [adding, setAdding] = useState(false)
  const images = useImagePicker(() => own, onUploadImage, onUploadError)
  // How narrow the bar is (toolbarLevel.ts): what folds into dropdowns and what moves to the second row
  const [level, bar] = useToolbarLevel()

  if (!state) return null

  const colours = <ColourButtons editor={editor} state={state} explained={level >= 2} />
  // Level 3 (a phone): the rows wrap between their groups, into as many rows as they need
  const rowClass = level >= 3 ? 'flex flex-wrap items-center gap-base' : 'flex flex-nowrap items-center gap-base overflow-x-auto'

  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label="Article formatting"
      // Every icon one size, 1.25rem: the buttons' own (a button sets its size from its text) and the colour fields'
      className="relative flex flex-col gap-base rounded-(--card-radius) border border-line bg-surface p-base shadow-sm [--btn-icon-size:1.25rem] [&_button]:[--btn-icon-size:1.25rem]"
    >
      {/* The first row: its buttons scroll sideways when they are too wide, until the bar is narrow enough to wrap them (level 3); More is outside
          the part that scrolls, so it is always in view, and the buttons give way to it */}
      <div className={`flex gap-base ${level >= 3 ? 'items-start' : 'items-center'}`}>
        <div className={`${rowClass} min-w-0 flex-1`}>
          <Idle idle={idle}>
            <Group>
              <ToolButton icon={LuUndo2} label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
              <ToolButton icon={LuRedo2} label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
            </Group>
            <Separator />
            <Group>
              <FontSelect editor={editor} font={state.font} />
              <SizeControl editor={editor} size={parseFloat(state.size) || FONT_SIZES.normal} />
              <BoldControl editor={editor} bold={state.bold} weight={state.weight} />
              <ItalicControl editor={editor} italic={state.italic} slant={state.slant} />
              <UnderlineControl editor={editor} on={state.underline} kind={state.underlineKind} colour={state.underlineColour} />
            </Group>
            {/* The colours, until the bar is narrow (level 2): then they are in the second row */}
            {level < 2 && (
              <>
                <Separator />
                {colours}
              </>
            )}
            <Separator />
            <Group>
              <ToolbarDropdown
                kind="menu"
                label="List"
                triggerIcon={LISTS.find((l) => l.value === state.list)?.icon ?? LuList}
                value={state.list}
                options={LISTS}
                onChange={(picked) => pickList(editor, picked as ListKind, state.list)}
              />
              {/* The alignments one next to the other, the current one pressed; one dropdown on a narrower bar (level 1) */}
              {level >= 1 ? (
                <ToolbarDropdown
                  kind="menu"
                  label="Align"
                  triggerIcon={ALIGNS.find((a) => a.value === state.align)?.icon ?? LuAlignLeft}
                  value={state.align}
                  options={ALIGNS}
                  onChange={(align) => editor.chain().focus().setTextAlign(align as Align).run()}
                />
              ) : (
                ALIGNS.map((a) => (
                  <ToolButton key={a.value} icon={a.icon} label={a.label} active={state.align === a.value} onClick={() => editor.chain().focus().setTextAlign(a.value).run()} />
                ))
              )}
            </Group>
            {/* A line, then Media and Link together with no space between them; the row's gap is on both sides of the line */}
            <Separator />
            <div className="flex shrink-0 items-center">
              <InsertMenu editor={editor} onImage={images.open} />
              <LinkPopover editor={editor} state={state} />
              {images.input}
            </div>
          </Idle>
        </div>
        {/* More: shows and hides the second row (it works before the text is opened too). Text like Media and Link's, but muted (not white), a line before it like the row's others, the
            arrow at its right: it turns to point right while the second row is open */}
        <div className="flex shrink-0 items-center gap-base">
          <Separator />
          <HoverInfo title={secondRow ? TOOLBAR_TIPS.hideSecondRow : TOOLBAR_TIPS.showSecondRow} side="top" delay={TIP_DELAY}>
            <Button
              variant="ghost"
              size="sm"
              plain
              aria-expanded={secondRow}
              onMouseDown={keepFocus}
              onClick={() => onSecondRowChange(!secondRow)}
              className="font-normal! [--btn-font-size:1rem]! [--btn-hover-text:var(--fg)]! [--btn-text:var(--fg-muted)]!"
            >
              More
              <LuChevronDown aria-hidden className={`ms-1 size-5 transition-transform duration-200 motion-reduce:transition-none ${secondRow ? '-rotate-90' : ''}`} />
            </Button>
          </HoverInfo>
        </div>
      </div>
      {/* The second row: the colours when the bar is narrow (shown even with the ⋯ closed), then, while the ⋯ has it open, Code at the left,
          the paragraph's dropdowns, Section and the Ω box at the right */}
      {(secondRow || level >= 2) && (
        <div className="flex flex-wrap items-center gap-base">
          {level >= 2 && <Idle idle={idle}>{colours}</Idle>}
          {level >= 2 && secondRow && <Separator />}
          {secondRow && (
            <>
              {/* Add section (its menu of kinds, in groups: the same as typing / in the text), then Code (both with their background, no line between them), at the left */}
              <AddSectionPopover
                open={adding}
                onOpenChange={setAdding}
                width="w-72"
                onSection={onSection}
                trigger={<TextButton tip={TOOLBAR_TIPS.addSection} icon={LuPlus} label="Add section" big filled active={adding} onClick={() => setAdding((open) => !open)} />}
              />
              <Idle idle={idle}>
                <TextButton tip={TOOLBAR_TIPS.code} icon={LuCode} label="Code" big filled active={state.code} onClick={() => showAsHtml(editor)} />
                <Separator />
                <Group className="gap-base!">
                  <ParagraphLook editor={editor} look={state.look} />
                </Group>
                {/* The Ω box at the right end of the row */}
                <Group className="ms-auto gap-lg!">
                  <Separator />
                  <OmegaBox editor={editor} compact={level >= 1} open={more} onOpenChange={setMore} />
                  {/* Link types: shows the links row while nothing is selected (with words selected it shows by itself). Shade: a background only when hovered */}
                  {!state.selected && (
                    <HoverInfo title="Link types" text={TOOLBAR_TIPS.linkTypes} side="top" delay={TIP_DELAY}>
                      <Button
                        variant={linkTypes.shown ? 'selected' : 'ghost'}
                        size="sm"
                        plain
                        icon={LuLink}
                        aria-pressed={linkTypes.shown}
                        onMouseDown={keepFocus}
                        onClick={linkTypes.onToggle}
                        className="font-normal! [--btn-font-size:1rem]! [--btn-icon-size:1rem]!"
                      >
                        Link types
                      </Button>
                    </HoverInfo>
                  )}
                </Group>
              </Idle>
            </>
          )}
        </div>
      )}
      {/* The links row: its own box a small gap (--spacing-sm) under the bar, over the text */}
      {linkRow && <div className="absolute inset-x-0 top-full z-20 mt-sm">{linkRow}</div>}
    </div>
  )
}
