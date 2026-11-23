import type { InvitationItem } from '@map/shared'
import InvitationCard from './InvitationCard'

/** Invitations as cards, one under the other */
export default function InboxList({ items, label }: { items: InvitationItem[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.id}>
          <InvitationCard invitation={i} />
        </li>
      ))}
    </ul>
  )
}
