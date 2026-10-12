import type { ButtonIcon } from '../../components/ui/icons/IconSlot'
import { CARD } from './cards/CardShell'

/** How a dragged object looks over the Dashboard's rows (a drag surface's look): a blank card */
export function SectionCardLook({ label, icon: Icon }: { label: string; icon?: ButtonIcon }) {
  return (
    <div className={`${CARD} bg-surface shadow-lg`}>
      <div className="flex h-24 items-center justify-center rounded-(--btn-radius) bg-fill text-fg-subtle">{Icon && <Icon className="size-6" />}</div>
      <p className="truncate px-1 text-body font-medium">{label}</p>
    </div>
  )
}
