import { LuMessageSquareText, LuPencil, LuX } from 'react-icons/lu'
import { useEffect } from 'react'
import IconButton from '../../../components/ui/buttons/IconButton'

type Props = {
  title: string
  content: string
  /** How far from the text's top it opens: level with the clicked words */
  top: number
  onClose: () => void
  /** Opens the Message form on these words */
  onEdit: () => void
}

/**
 * A message of the article, opened by clicking its words: a card at the right of the text, level with them, over the text's right side
 * (like the Info box's column). One at a time; ✕ or Esc closes it
 */
export default function MessagePanel({ title, content, top, onClose, onEdit }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <aside
      aria-label={`Message: ${title || 'untitled'}`}
      style={{ top }}
      className="absolute end-0 z-30 flex w-[clamp(12rem,35%,18rem)] animate-share-pop flex-col gap-2 rounded-(--card-radius) border border-line bg-surface p-3 shadow-xl"
    >
      <div className="flex items-start gap-2">
        <LuMessageSquareText className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
        <h3 className="min-w-0 flex-1 text-body font-medium break-words">{title || 'Message'}</h3>
        <IconButton icon={LuPencil} label="Edit the message" size="sm" onClick={onEdit} />
        <IconButton icon={LuX} label="Close" size="sm" onClick={onClose} />
      </div>
      {content && <p className="max-h-80 overflow-y-auto text-body whitespace-pre-wrap text-fg-muted">{content}</p>}
    </aside>
  )
}
