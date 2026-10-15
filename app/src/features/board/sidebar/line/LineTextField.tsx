import { useRef, useState } from 'react'
import { LuArrowDownToLine, LuArrowUpToLine, LuCheck, LuPencil, LuTrash2, LuX } from 'react-icons/lu'
import Button from '../../../../components/ui/buttons/Button'
import IconButton from '../../../../components/ui/buttons/IconButton'
import { runsPatch, textChange } from '../../areaName'
import { changeObjects, updateObject } from '../../boardStore'
import { nameTextOfLine, newLineNameText, placeOnSide, sideOf } from '../../lineName'
import { select } from '../../selection'
import { runsOf, type BoardObject, type LineObject } from '../../types'

type Props = { mapId: string; line: LineObject; board: BoardObject[] }

/**
 * The text of a line, at the top of its sidebar: an input with the words of the text tied to the line (empty while it has none).
 * Typing shows a tick and a cross; the tick, Enter or leaving the input saves, the cross or Esc takes the typing back. Saving
 * words adds the text above the middle of the line (turned along it, tied to it), or changes its words; saving nothing removes it.
 */
export default function LineTextField({ mapId, line, board }: Props) {
  const text = nameTextOfLine(board, line.id)
  const saved = text?.text ?? ''
  // What is typed, until it is saved or taken back; null: showing the saved words
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const changed = draft !== null && draft !== saved

  const save = () => {
    const words = (draft ?? saved).trim()
    if (!cancelled.current && words !== saved) {
      if (!text) changeObjects(mapId, { add: [newLineNameText(line, words)] })
      else if (words === '') changeObjects(mapId, { remove: [text.id] })
      else {
        const { text: _first, ...marks } = runsOf(text)[0] ?? { text: '' }
        changeObjects(mapId, textChange(text, runsPatch([{ ...marks, text: words }])))
      }
    }
    cancelled.current = false
    setDraft(null)
  }

  const side = text ? sideOf(line, text) : null

  return (
    <div className="flex flex-col gap-2">
    <div className="flex items-center gap-1">
      <input
        ref={input}
        value={draft ?? saved}
        placeholder="Text on the line"
        aria-label="Text on the line"
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
        className="min-w-0 flex-1 rounded-(--btn-close-radius) bg-fill px-2 py-1 text-body outline-none focus-visible:outline-2 focus-visible:outline-accent"
      />
      {changed && (
        <>
          {/* Mouse down on them must not take the focus from the input: leaving it would save before the cross could take the typing back */}
          <span onMouseDown={(e) => e.preventDefault()} className="contents">
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
        </>
      )}
    </div>
      {text && (
        <div className="flex gap-1">
          <Button variant="secondary" icon={LuPencil} onClick={() => select(mapId, [text.id])} className="flex-auto whitespace-nowrap">
            Edit text
          </Button>
          <Button
            variant="secondary"
            icon={side === 'above' ? LuArrowDownToLine : LuArrowUpToLine}
            title={side === 'above' ? 'Put the text below the line' : 'Put the text above the line'}
            onClick={() => updateObject(mapId, text.id, placeOnSide(line, text, side === 'above' ? 'below' : 'above'))}
            className="flex-auto whitespace-nowrap"
          >
            {side === 'above' ? 'Below' : 'Above'}
          </Button>
          <Button variant="secondary" icon={LuTrash2} onClick={() => changeObjects(mapId, { remove: [text.id] })} className="flex-auto whitespace-nowrap">
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}
