// Who else may read or edit a shared row (docs/plans/34): the owner is the row's own user; other people have a row in object_rights
// with a role; a public row can be read by everyone signed in. Rights are not inherited (a right on a folder is not one on its items).
import { z } from 'zod'
import { entityId, queryId, type Author } from './common'
import { SHAREABLE } from './data.config'

/** What an allowed person can do: only read the row, or edit it too (editing needs reading) */
export type Role = 'reader' | 'editor'
export const ROLES = ['reader', 'editor'] as const satisfies readonly Role[]
/** What the caller may do with a row: its owner, or their role (a public row: reader) */
export type ItemAccess = 'owner' | Role

export type Visibility = 'private' | 'public'
export const VISIBILITIES = ['private', 'public'] as const satisfies readonly Visibility[]

/** The most people one Apply of the privacy panel can change */
export const RIGHTS_CHANGE_MAX = 50

const userRef = z.string().min(1).max(100)

/**
 * The privacy panel's Apply: the visibility (when it changes), the people given a role (added or changed), the people taken out.
 * Only the changes are sent
 */
export const rightsApply = z
  .object({
    objectType: z.enum(SHAREABLE),
    objectId: entityId,
    visibility: z.enum(VISIBILITIES).optional(),
    set: z.array(z.object({ userId: userRef, role: z.enum(ROLES) })).max(RIGHTS_CHANGE_MAX).default([]),
    remove: z.array(userRef).max(RIGHTS_CHANGE_MAX).default([]),
  })
  .refine((v) => new Set(v.set.map((s) => s.userId)).size === v.set.length, { message: 'Each person once', path: ['set'] })
  .refine((v) => !v.set.some((s) => v.remove.includes(s.userId)), { message: 'A person is both set and removed', path: ['remove'] })
export type RightsApply = z.infer<typeof rightsApply>

/** GET /api/object-rights?objectType=&objectId=: the people of one row (its owner asks) */
export const rightsFilter = z.object({ objectType: z.enum(SHAREABLE), objectId: queryId })
export type RightsFilter = z.infer<typeof rightsFilter>

/** A person allowed on a row */
export type Right = { id: number; user: Author; role: Role }

/** A row's sharing, as its owner sees it */
export type Sharing = { visibility: Visibility; rights: Right[] }

/** A row shared with the caller ("Shared with me") */
export type SharedItem = {
  /** The right's id (the list's order: newest first) */
  id: number
  objectType: (typeof SHAREABLE)[number]
  objectId: number
  title: string
  role: Role
  owner: { name: string } | null
}
