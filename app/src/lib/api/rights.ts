import type { Right, RightsApply, ShareableName, Sharing } from '@map/shared'
import { request } from './client'
import { toQuery } from './resource'

/** The people a row of the caller's is shared with, by name (its owner only) */
export const listRights = (objectType: ShareableName, objectId: number | string) =>
  request<Right[]>(`/api/object-rights${toQuery({ objectType, objectId })}`)

/** The privacy panel's Apply: only the changes, in one request; answers the row's visibility and people as they are now */
export const applyRights = (body: Omit<RightsApply, 'set' | 'remove'> & Partial<Pick<RightsApply, 'set' | 'remove'>>) =>
  request<Sharing>('/api/object-rights/apply', { method: 'POST', json: body })
