import { useRef, useState } from 'react'
import { LuFocus } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'
import HoverInfo from '../../../../components/ui/overlays/HoverInfo'
import { runsPatch, textChange } from '../../areaName'
import { changeObjects } from '../../boardStore'
import ForwardLink from '../../ForwardLink'
import { runsOf, type BoardObject, type TextObject } from '../../types'

type Props = {
  mapId: string
  text: TextObject
  board: BoardObject[]
  onFocus: () => void
  onShowBoardObject: (id: number) => void
}

/**
 * The top of a text's modal: what the text says as the name (an input: leaving it saves, Esc undoes; it keeps the marks of the
 * text's first stretch), the Focus button and the forward link at its right.
 */
export default function TextHeaderSection({ mapId, text, board, onFocus, onShowBoardObject }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)

  const commit = () => {
    const words = draft ?? text.text
    // Emptying it would delete the text (or an area's name): leaving it empty keeps what it said
    if (!cancelled.current && words.trim() !== '' && words !== text.text) {
      const { text: _first, ...marks } = runsOf(text)[0] ?? { text: '' }
      changeObjects(mapId, textChange(text, runsPatch([{ ...marks, text: words }])))
    }
    cancelled.current = false
    setDraft(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <textarea
          rows={1}
          value={draft ?? text.text}
          placeholder="Text"
          aria-label="What the text says"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              cancelled.current = true
              e.currentTarget.blur()
            }
          }}
          className="max-h-40 min-h-8 min-w-0 flex-1 resize-none rounded-(--btn-close-radius) bg-fill px-2 py-1 text-body [field-sizing:content] outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />
        <HoverInfo title="Focus" text="Zoom the map to this object." side="bottom">
          <IconButton icon={LuFocus} label="Focus" onClick={onFocus} />
        </HoverInfo>
        <ForwardLink object={text} board={board} onShowBoardObject={onShowBoardObject} />
      </div>
    </div>
  )
}
