import type { ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'

/**
 * The top of the left forms (a point's, an article's): the title (a TitleInput `size="2xl"`) and the big ✕ as tall as the title row. The distance to what
 * follows is the form's own gap (--spacing-base)
 */
export default function FormHeader({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <>
    <div className="flex h-12 shrink-0 items-center gap-2">
      {children}
      <IconButton bigIcon icon={LuX} label="Close" onClick={onClose} className="size-12! shrink-0 [--btn-icon-size:2rem]!" />
    </div>
    {/* A line under it, like the one over the form's bottom buttons */}
    <div aria-hidden className="h-px shrink-0 bg-line" />
    </>
  )
}
