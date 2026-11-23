import type { Author } from '@map/shared'
import { placeholderArt } from '../objects/placeholderArt'
import { initialsOf } from './initials'

/** A person's round picture: theirs, or their initials on a colour made from their id */
export default function Avatar({ person, size = 'size-6' }: { person: Author; size?: string }) {
  if (person.image) return <img src={person.image} alt="" referrerPolicy="no-referrer" className={`shrink-0 rounded-full object-cover ${size}`} />
  return (
    <span aria-hidden style={placeholderArt(person.id)} className={`inline-flex shrink-0 items-center justify-center rounded-full text-small font-medium text-fg ${size}`}>
      {initialsOf(person)}
    </span>
  )
}
