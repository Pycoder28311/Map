// Who else can see or edit a row of a shared table (docs/plans/34): what the privacy panel shows and sends. The pure rules of its
// switches (sharing.test.ts), and `useSharing`, which reads the row's people only when the panel opens and sends Apply in one request.
import type { Author, Right, Role, ShareableName, Visibility } from '@map/shared'
import { useCallback, useState } from 'react'
import { applyRights, listRights } from '../../lib/api/rights'
import { patchChanged } from '../../lib/resource/changes'

export type { Visibility }
/** What an allowed person can do: only read, or edit */
export type AllowedRole = Role
export type Allowed = { id: string; role: AllowedRole }

/** The list with this person given a role (added if they were not there), or taken out (`role` null) */
export function withRole(allowed: Allowed[], id: string, role: AllowedRole | null): Allowed[] {
  const rest = allowed.filter((a) => a.id !== id)
  if (!role) return rest
  return allowed.some((a) => a.id === id) ? allowed.map((a) => (a.id === id ? { id, role } : a)) : [...rest, { id, role }]
}

/** What a person is given while the list is being edited, before Apply: chosen or not, and the two switches */
export type Permission = { on: boolean; read: boolean; edit: boolean }

/** A person's permission as the saved list has it */
export function permissionOf(allowed: Allowed[], id: string): Permission {
  const a = allowed.find((x) => x.id === id)
  return a ? { on: true, read: true, edit: a.role === 'editor' } : { on: false, read: false, edit: false }
}

/** The switches' rules: editing needs reading (editing on turns reading on, reading off turns editing off), choosing a person starts with reading */
export function withSwitch(p: Permission, change: Partial<Permission>): Permission {
  const next = { ...p, ...change }
  if (change.on === true && !p.on && !next.read && !next.edit) next.read = true
  if (change.on === false) return { on: false, read: false, edit: false }
  if (change.edit === true) next.read = true
  if (change.read === false) next.edit = false
  return next
}

/** The saved list after the edits: a chosen person with a switch on is a reader (reading) or an editor (editing); the others are out */
export function allowedFrom(allowed: Allowed[], edits: Record<string, Permission>): Allowed[] {
  const ids = [...new Set([...allowed.map((a) => a.id), ...Object.keys(edits)])]
  const out: Allowed[] = []
  for (const id of ids) {
    const p = edits[id] ?? permissionOf(allowed, id)
    if (p.on && (p.read || p.edit)) out.push({ id, role: p.edit ? 'editor' : 'reader' })
  }
  return out
}

/** What changes if the edits are applied: who gets access, whose access changes, who loses it */
export function changesOf(allowed: Allowed[], next: Allowed[]) {
  const was = (id: string) => allowed.find((a) => a.id === id)
  return {
    added: next.filter((n) => !was(n.id)),
    changed: next.filter((n) => was(n.id) && was(n.id)!.role !== n.role),
    removed: allowed.filter((a) => !next.some((n) => n.id === a.id)),
  }
}

/** The saved people as the switches' rules take them (a person by their user id) */
export const allowedOf = (rights: Right[]): Allowed[] => rights.map((r) => ({ id: r.user.id, role: r.role }))

type State = { visibility: Visibility; rights: Right[] | null; loading: boolean; error: string | null }

/**
 * A row's sharing, for its owner's privacy panel: the visibility (from the row, no read) and the people, read when `load` is called
 * (the panel opened). Each change is one request that answers the row's sharing as it is now, so nothing is read again. A new
 * visibility also shows at once wherever the row is shown (its lists, its open page)
 */
export function useSharing(objectType: ShareableName, objectId: number, visibility: Visibility) {
  const [state, setState] = useState<State>({ visibility, rights: null, loading: false, error: null })

  const load = useCallback(() => {
    if (state.rights !== null || state.loading) return
    setState((s) => ({ ...s, loading: true, error: null }))
    listRights(objectType, objectId).then(
      (rights) => setState((s) => ({ ...s, rights, loading: false })),
      (e: Error) => setState((s) => ({ ...s, loading: false, error: e.message })),
    )
  }, [objectType, objectId, state.rights, state.loading])

  /** Sends the changes (only them); resolves when the server has them, throws its error */
  const apply = useCallback(
    async (change: { visibility?: Visibility; set?: Allowed[]; remove?: string[] }) => {
      setState((s) => ({ ...s, error: null }))
      try {
        const sharing = await applyRights({
          objectType,
          objectId,
          visibility: change.visibility,
          set: change.set?.map((a) => ({ userId: a.id, role: a.role })),
          remove: change.remove,
        })
        setState((s) => ({ ...s, visibility: sharing.visibility, rights: sharing.rights }))
        patchChanged(objectType, objectId, { visibility: sharing.visibility })
      } catch (e) {
        setState((s) => ({ ...s, error: (e as Error).message }))
        throw e
      }
    },
    [objectType, objectId],
  )

  return { ...state, load, apply }
}

/** A person's initials, for their round picture when they have none */
export const initialsOf = (person: Pick<Author, 'name'>) =>
  person.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
