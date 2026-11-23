// Invitations (docs/plans/40): one table for every kind. A kind is a `type`, the schema of its `payload`, and (in the backend) what to
// check when it is sent and what to write when it is accepted. Only `collaboration` exists now: the creator of an item invites a person
// they follow to be a collaborator on it with a role; accepting makes them one.
import { z } from 'zod'
import { entityId, queryId, type Author } from './common'
import { INVITABLE, type InvitableName } from './data.config'
import { ROLES, type Role } from './rights'

export const INVITATION_TYPES = ['collaboration'] as const
export type InvitationType = (typeof INVITATION_TYPES)[number]

export const INVITATION_STATUSES = ['pending', 'accepted', 'declined'] as const
export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

/** Each kind's payload */
export const INVITATION_PAYLOADS = {
  collaboration: z.object({ role: z.enum(ROLES) }),
} as const satisfies Record<InvitationType, z.ZodType>
export type CollaborationPayload = { role: Role }

const userRef = z.string().min(1).max(100)

/** POST /api/invitations: one kind at a time (a union on `type`) */
export const invitationInput = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('collaboration'),
    recipientId: userRef,
    objectType: z.enum(INVITABLE),
    objectId: entityId,
    payload: INVITATION_PAYLOADS.collaboration,
  }),
])
export type InvitationInput = z.infer<typeof invitationInput>

/** PATCH /api/invitations/:id: the recipient's answer */
export const invitationAnswer = z.object({ status: z.enum(['accepted', 'declined']) })
export type InvitationAnswer = z.infer<typeof invitationAnswer>

/** GET /api/invitations: my inbox, or the ones I sent (optionally for one item) */
export const invitationsFilter = z
  .object({
    box: z.enum(['inbox', 'sent']),
    status: z.enum(INVITATION_STATUSES).optional(),
    type: z.enum(INVITATION_TYPES).optional(),
    objectType: z.enum(INVITABLE).optional(),
    objectId: queryId.optional(),
  })
  .refine((f) => f.objectId === undefined || f.objectType !== undefined, { message: 'objectId needs objectType', path: ['objectId'] })
export type InvitationsFilter = z.infer<typeof invitationsFilter>

/** One invitation as both people see it */
export type InvitationItem = {
  id: number
  type: InvitationType
  status: InvitationStatus
  createdAt: string
  answeredAt: string | null
  from: Author
  to: Author
  /** What it is about: its title as it is now ('' when untitled); null for kinds about no item */
  object: { type: InvitableName; id: number; title: string } | null
  payload: CollaborationPayload
}

/** GET /api/invitations/pending-count */
export type PendingCount = { count: number }
