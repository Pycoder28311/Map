import SidePanel from './SidePanel'
import { useEffect, useRef, useState } from 'react'
import { changeObjects } from './boardStore'
import { coloursOf, countOf, recolour } from './colours'
import type { BoardObject } from './types'

/** A colour input that shows the pick as it moves but only commits when the picker closes: one undo step per change */
function ColourRow({ colour, count, onCommit }: { colour: string; count: number; onCommit: (to: string) => void }) {
  const [shown, setShown] = useState(colour)
  const input = useRef<HTMLInputElement>(null)
  const commit = useRef(onCommit)
  useEffect(() => {
    commit.current = onCommit
  })
  useEffect(() => {
    const el = input.current
    if (!el) return
    // The browser's `change` comes when the picker closes (React's onChange is every `input`)
    const onChange = () => commit.current(el.value)
    el.addEventListener('change', onChange)
    return () => el.removeEventListener('change', onChange)
  }, [])
  return (
    <li className="flex items-center gap-3">
      <input ref={input} type="color" value={shown} aria-label={`Colour ${colour}`} onChange={(e) => setShown(e.target.value)} className="size-9 cursor-pointer rounded-(--btn-close-radius) border border-line bg-transparent p-0.5" />
      <span className="flex-1 text-body tabular-nums">{shown}</span>
      <span className="text-small text-fg-muted">{count === 1 ? '1 object' : `${count} objects`}</span>
    </li>
  )
}

/** Several objects selected: one colour input per colour among them; changing one recolours everything that uses it */
export default function ColoursPanel({ mapId, selected }: { mapId: string; selected: BoardObject[] }) {
  const colours = coloursOf(selected)
  return (
    <SidePanel label="Colours of the selection">
      <h2 className="text-heading">{selected.length} objects</h2>
      {colours.length === 0 ? (
        <p className="text-body text-fg-muted">Nothing here has a colour.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {colours.map((colour) => (
            <ColourRow key={colour} colour={colour} count={countOf(selected, colour)} onCommit={(to) => changeObjects(mapId, recolour(selected, colour, to))} />
          ))}
        </ul>
      )}
    </SidePanel>
  )
}
