// Following people (docs/plans/40): no approval; a follow only lets its follower invite the person to collaborate. A user's lists are
// seen by themselves and by the people they collaborate with, not by their followers.
import { z } from 'zod'
import type { Author } from './common'

const userRef = z.string().min(1).max(100)

/** POST /api/follows: follow this person */
export const followInput = z.object({ userId: userRef })
export type FollowInput = z.infer<typeof followInput>

/** A follow has nothing to change: PATCH takes nothing (and answers 404) */
export const followUpdate = z.object({}).strict()

export const FOLLOW_DIRECTIONS = ['followers', 'following'] as const
export type FollowDirection = (typeof FOLLOW_DIRECTIONS)[number]

/** GET /api/follows?direction=&userId=: someone's followers, or the people they follow (no userId: mine) */
export const followsFilter = z.object({ direction: z.enum(FOLLOW_DIRECTIONS), userId: userRef.optional() })
export type FollowsFilter = z.infer<typeof followsFilter>

/** GET /api/follows/counts?userId= */
export const followCountsQuery = z.object({ userId: userRef.optional() })

/**
 * One person of a list: the follow's id (unfollow / remove it with DELETE /api/follows/:id), the other person, since when, and whether
 * the caller and that person follow each other's way too (a follower I follow back; someone I follow who follows me)
 */
export type FollowItem = {
  id: number
  user: Author
  since: string
  /** On my lists: whether I follow them (on Followers) or they follow me (on Following) */
  mutual: boolean
}

export type FollowCounts = { followers: number; following: number }

/** The follow between the caller and one person, as POST answers it */
export type Follow = { id: number; followerId: string; followeeId: string; since: string }
