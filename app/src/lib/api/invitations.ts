import type { InvitationAnswer, InvitationInput, InvitationItem, InvitationsFilter, PendingCount } from '@map/shared'
import { request } from './client'
import { createResourceApi } from './resource'

/** /api/invitations (docs/plans/40): my inbox or the ones I sent, send, answer (PATCH { status }), unsend (DELETE) */
export const invitationsApi = createResourceApi<InvitationItem, InvitationItem, InvitationInput, InvitationAnswer, InvitationsFilter>('/api/invitations')

/** The inbox badge: how many invitations wait for an answer */
export const pendingInvitations = () => request<PendingCount>('/api/invitations/pending-count')
