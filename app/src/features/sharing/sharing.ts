// Who else can see or edit a row of a shared table (docs/plans/34, 40): what the privacy panel shows and sends. Its creator makes it
// private or public, invites people they follow (projects, folders, articles, maps), unsends an unanswered invitation, changes a
// collaborator's role or takes them away. `useSharing` reads the row's people and pending invitations only when the panel opens.
import { isInvitable, type Collaborator, type InvitationItem, type Role, type ShareableName, type Visibility } from '@map/shared'
import { useCallback, useState } from 'react'
import { invitationsApi } from '../../lib/api/invitations'
import { applyRights, listRights, removeRight, updateRight } from '../../lib/api/rights'
import { patchChanged } from '../../lib/resource/changes'

export type { Visibility }
export { initialsOf } from '../people/initials'

type State = {
  visibility: Visibility
  /** The creator first, then the collaborators; null until read */
  people: Collaborator[] | null
  /** The invitations sent for this row that wait for an answer; null until read */
  pending: InvitationItem[] | null
  loading: boolean
  error: string | null
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')

/** The collaborators only (the creator is the first of `people`) */
export const collaboratorsIn = (people: Collaborator[] | null) => (people ?? []).filter((p) => p.role !== 'owner')

/**
 * A row's sharing, for its owner's privacy panel: the visibility (from the row, no read) and, read when `load` is called (the panel
 * opened), its people and its pending invitations. Each change is one request and updates the state from its answer, with no new read
 */
export function useSharing(objectType: ShareableName, objectId: number, visibility: Visibility) {
  const [state, setState] = useState<State>({ visibility, people: null, pending: null, loading: false, error: null })
  const invitable = isInvitable(objectType)

  const load = useCallback(() => {
    if (state.people !== null || state.loading) return
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.all([
      listRights(objectType, objectId),
      invitable ? invitationsApi.list({ box: 'sent', status: 'pending', objectType, objectId }, { limit: 100 }).then((p) => p.items) : Promise.resolve([]),
    ]).then(
      ([people, pending]) => setState((s) => ({ ...s, people, pending, loading: false })),
      (e: unknown) => setState((s) => ({ ...s, loading: false, error: message(e) })),
    )
  }, [objectType, objectId, invitable, state.people, state.loading])

  /** Runs one change; its error goes to `error` and is thrown again */
  const run = useCallback(async (change: () => Promise<void>) => {
    setState((s) => ({ ...s, error: null }))
    try {
      await change()
    } catch (e) {
      setState((s) => ({ ...s, error: message(e) }))
      throw e
    }
  }, [])

  const setVisibility = useCallback(
    (next: Visibility) =>
      run(async () => {
        const sharing = await applyRights({ objectType, objectId, visibility: next })
        setState((s) => ({ ...s, visibility: sharing.visibility }))
        patchChanged(objectType, objectId, { visibility: sharing.visibility })
      }),
    [objectType, objectId, run],
  )

  /** Takes a collaborator away */
  const remove = useCallback(
    (person: Collaborator) =>
      run(async () => {
        if (person.id === null) return
        await removeRight(person.id)
        setState((s) => ({ ...s, people: (s.people ?? []).filter((p) => p.id !== person.id) }))
      }),
    [run],
  )

  /** Changes a collaborator's role */
  const changeRole = useCallback(
    (person: Collaborator, role: Role) =>
      run(async () => {
        if (person.id === null) return
        const right = await updateRight(person.id, role)
        setState((s) => ({ ...s, people: (s.people ?? []).map((p) => (p.id === right.id ? { ...p, role: right.role } : p)) }))
      }),
    [run],
  )

  /** Invites a person I follow (projects, folders, articles, maps) */
  const invite = useCallback(
    (recipientId: string, role: Role) =>
      run(async () => {
        if (!isInvitable(objectType)) return
        const made = await invitationsApi.create({ type: 'collaboration', recipientId, objectType, objectId, payload: { role } })
        setState((s) => ({ ...s, pending: [made, ...(s.pending ?? [])] }))
      }),
    [objectType, objectId, run],
  )

  /** Unsends an invitation that is not answered yet */
  const unsend = useCallback(
    (invitation: InvitationItem) =>
      run(async () => {
        await invitationsApi.remove(invitation.id)
        setState((s) => ({ ...s, pending: (s.pending ?? []).filter((i) => i.id !== invitation.id) }))
      }),
    [run],
  )

  return { ...state, invitable, load, setVisibility, remove, changeRole, invite, unsend }
}

export type Sharing = ReturnType<typeof useSharing>

/** The people I follow who can be invited: not on the row, not invited already */
export function invitableFrom<T extends { user: { id: string } }>(following: T[], people: Collaborator[] | null, pending: InvitationItem[] | null): T[] {
  const taken = new Set([...(people ?? []).map((p) => p.user.id), ...(pending ?? []).map((i) => i.to.id)])
  return following.filter((f) => !taken.has(f.user.id))
}
