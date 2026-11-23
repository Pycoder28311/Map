import type { Follow, FollowCounts, FollowInput, FollowItem, FollowsFilter } from '@map/shared'
import { request } from './client'
import { createResourceApi, toQuery } from './resource'

/** /api/follows (docs/plans/40): someone's followers or the people they follow, follow, unfollow / remove a follower */
export const followsApi = createResourceApi<Follow, FollowItem, FollowInput, Record<string, never>, FollowsFilter>('/api/follows')

/** How many follow someone and how many they follow (no userId: me) */
export const followCounts = (userId?: string) => request<FollowCounts>(`/api/follows/counts${toQuery({ userId })}`)
