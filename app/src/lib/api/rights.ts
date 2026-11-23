import type { Collaborator, Right, RightsApply, Role, ShareableName, Sharing } from '@map/shared'
import { request } from './client'
import { toQuery } from './resource'

/** A row's creator and collaborators (its creator or one of its collaborators asks), the creator first */
export const listRights = (objectType: ShareableName, objectId: number | string) =>
  request<Collaborator[]>(`/api/object-rights${toQuery({ objectType, objectId })}`)

/** The creator changes a collaborator's role */
export const updateRight = (id: number, role: Role) => request<Right>(`/api/object-rights/${id}`, { method: 'PATCH', json: { role } })

/** The creator takes a collaborator away, or a collaborator leaves (their own right) */
export const removeRight = (id: number) => request<void>(`/api/object-rights/${id}`, { method: 'DELETE' })

/** The privacy panel's Apply: the visibility and the people taken out, in one request; answers the row's visibility and people as they are now */
export const applyRights = (body: Omit<RightsApply, 'remove'> & Partial<Pick<RightsApply, 'remove'>>) =>
  request<Sharing>('/api/object-rights/apply', { method: 'POST', json: body })
