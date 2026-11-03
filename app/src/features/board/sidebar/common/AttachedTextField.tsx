import { useRef, useState, type ReactNode } from 'react'
import { LuArrowDownToLine, LuArrowUpToLine, LuCheck, LuPencil, LuTrash2, LuX } from 'react-icons/lu'
import Button from '../../../../components/ui/buttons/Button'
import IconButton from '../../../../components/ui/buttons/IconButton'
import HoverInfo, { TIP_DELAY } from '../../../../components/ui/overlays/HoverInfo'
import { changeObjects, updateObject } from '../../boardStore'
import { placeOnSide, sideOf } from '../../lineName'
import { titleChange, titleTextOf } from '../../objectTitle'
import { select } from '../../selection'
import type { BoardObject, BorderObject, LineObject } from '../../types'
import { keepFocus } from '../../../../lib/keepFocus'

type Props = {
  mapId: string
  /** A line (its text sits above or below its middle) or a closed area (its text is its name, in its middle) */
  owner: LineObject | BorderObject
  board: BoardObject[]
  /** Shown under the input once it was clicked (the description and the article's button), or at once when there is something in it */
  below?: ReactNode
  /** `below` has something to show, so it is open from the start */
  belowFilled?: boolean
}

/**
 * The text of a line or of a closed area, at the top of its sidebar: an input with the words of the text tied to it (empty while it has
 * none), and under it Edit text and Remove, side by side, with their names. Typing shows a tick and a cross; the tick, Enter or leaving the input saves, the cross or Esc takes the typing back. Saving words
 * adds the text (a line's above its middle, turned along it; an area's in its middle, as its name) or changes them; saving nothing removes
 * it. Under it, once the input is clicked, `below`
 */
export default function AttachedTextField({ mapId, owner, board, below, belowFilled = false }: Props) {
  const area = owner.kind === 'border'
  const text = titleTextOf(owner, board)
  const saved = text?.text ?? ''
  // What is typed, until it is saved or taken back; null: showing the saved words
  const [draft, setDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(belowFilled)
  const cancelled = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const changed = draft !== null && draft !== saved
  const what = area ? 'Text in area' : 'Text on the line'

  const save = () => {
    const words = (draft ?? saved).trim()
    if (!cancelled.current && words !== saved) {
      // (an area's text is its name too: they change together)
      changeObjects(mapId, titleChange(owner, board, words))
    }
    cancelled.current = false
    setDraft(null)
  }
  const remove = () => changeObjects(mapId, titleChange(owner, board, ''))

  const side = text && !area ? sideOf(owner, text) : null

  return (
    <div className="flex flex-col gap-2">
      {/* (the tick and the cross stretch to the input's height) */}
      <div className="flex items-stretch gap-1">
        <input
          ref={input}
          value={draft ?? saved}
          placeholder={what}
          aria-label={what}
          onFocus={() => setOpen(true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              cancelled.current = true
              e.currentTarget.blur()
            }
          }}
          className="min-w-0 flex-1 rounded-(--field-radius) border border-line-strong bg-surface px-2 py-2 text-body outline-none focus-visible:border-fg-subtle"
        />
        {changed && (
          // Mouse down on them must not take the focus from the input: leaving it would save before the cross could take the typing back
          <span onMouseDown={keepFocus} className="contents">
            <IconButton icon={LuCheck} label="Save the text" onClick={() => input.current?.blur()} />
            <IconButton
              icon={LuX}
              label="Take back"
              onClick={() => {
                cancelled.current = true
                input.current?.blur()
              }}
            />
          </span>
        )}
        {/* Square icons at the right of the input, as tall as it, with a background only while hovered (not while typing: then the tick and the cross are there) */}
      </div>
      {/* Under the input, the two of them side by side (a gap of --spacing-base), with their names */}
      {text && !changed && (
        <div className="flex gap-base">
          <HoverInfo title="Edit text" text="Selects the text, to change its font, size and colour." side="left" delay={TIP_DELAY}>
            <Button variant="ghost" size="sm" plain filled icon={LuPencil} className="flex-1" onClick={() => select(mapId, [text.id])}>
              Edit text
            </Button>
          </HoverInfo>
          <HoverInfo title="Remove" text={area ? 'Takes the text out of the area (and its name).' : 'Takes the text off the line.'} side="left" delay={TIP_DELAY}>
            <Button variant="ghost" size="sm" plain filled icon={LuTrash2} className="flex-1" onClick={remove}>
              Remove
            </Button>
          </HoverInfo>
        </div>
      )}
      {text && !area && side && (
        <div className="flex gap-1">
          <Button
            variant="secondary"
            icon={side === 'above' ? LuArrowDownToLine : LuArrowUpToLine}
            title={side === 'above' ? 'Put the text below the line' : 'Put the text above the line'}
            onClick={() => updateObject(mapId, text.id, placeOnSide(owner as LineObject, text, side === 'above' ? 'below' : 'above'))}
            className="flex-auto whitespace-nowrap"
          >
            {side === 'above' ? 'Below' : 'Above'}
          </Button>
        </div>
      )}
      {(open || belowFilled) && below}
    </div>
  )
}
