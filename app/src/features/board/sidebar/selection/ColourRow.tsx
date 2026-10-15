import { useEffect, useRef, useState } from 'react'

/** A colour input that shows the pick as it moves but only commits when the picker closes: one undo step per change */
export default function ColourRow({ colour, count, onCommit }: { colour: string; count: number; onCommit: (to: string) => void }) {
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
