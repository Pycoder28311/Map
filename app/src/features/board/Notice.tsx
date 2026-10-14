import { useEffect } from 'react'
import { LuX } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { FLOAT } from './floating'

const SHOWN_MS = 6000

/** A short note at the bottom centre of the editor ("Used as the name of this area"); goes by itself or with ✕ */
export default function Notice({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, SHOWN_MS)
    return () => window.clearTimeout(id)
  }, [text, onDismiss])
  return (
    <div role="status" className={`pointer-events-auto absolute start-1/2 bottom-16 flex -translate-x-1/2 items-center gap-2 py-1.5 ps-4 pe-1.5 ${FLOAT}`}>
      <span className="text-body">{text}</span>
      <IconButton icon={LuX} label="Dismiss" onClick={onDismiss} />
    </div>
  )
}
