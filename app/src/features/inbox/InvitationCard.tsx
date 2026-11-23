import type { InvitationItem } from '@map/shared'
import CollaborationCard from './cards/CollaborationCard'

/** One invitation, by its kind: a new kind adds its card here */
export default function InvitationCard({ invitation }: { invitation: InvitationItem }) {
  switch (invitation.type) {
    case 'collaboration':
      return <CollaborationCard invitation={invitation} />
    default:
      return null
  }
}
