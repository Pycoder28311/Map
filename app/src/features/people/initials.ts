import type { Author } from '@map/shared'

/** A person's initials, for their round picture when they have none */
export const initialsOf = (person: Pick<Author, 'name'>) =>
  person.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
