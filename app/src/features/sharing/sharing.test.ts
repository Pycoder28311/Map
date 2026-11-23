import type { Collaborator, InvitationItem } from '@map/shared'
import { describe, expect, it } from 'vitest'
import { collaboratorsIn, initialsOf, invitableFrom } from './sharing'

const person = (id: string) => ({ id, name: id, image: null })
const people: Collaborator[] = [
  { id: null, role: 'owner', user: person('me') },
  { id: 1, role: 'editor', user: person('ann') },
]
const pending = [{ id: 5, to: person('bob') }] as unknown as InvitationItem[]

describe('sharing', () => {
  it('the collaborators are the people but the creator', () => {
    expect(collaboratorsIn(people).map((p) => p.user.id)).toEqual(['ann'])
    expect(collaboratorsIn(null)).toEqual([])
  })
  it('offers the people I follow who are not on the row and not invited yet', () => {
    const following = ['ann', 'bob', 'cleo'].map((id) => ({ user: person(id) }))
    expect(invitableFrom(following, people, pending).map((f) => f.user.id)).toEqual(['cleo'])
    expect(invitableFrom(following, null, null)).toHaveLength(3)
  })
  it('initials', () => {
    expect(initialsOf({ name: 'Eleni Markou' })).toBe('EM')
    expect(initialsOf({ name: '  ' })).toBe('?')
  })
})
