import { z } from 'zod'

/** A row id sent in a JSON body */
export const entityId = z.number().int().positive()

/** A row id sent in the query string (?postId=1) */
export const queryId = z.coerce.number().int().positive()

/** Ordered ids of images uploaded through POST /api/images (first = cover) */
export const imageIds = z
  .array(entityId)
  .max(10)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Each image can be used once' })

/** An image as clients receive it */
export type ImageRef = {
  id: number
  url: string
}

/** The public part of a user, shown next to what they wrote (never their email) */
export type Author = {
  id: string
  name: string
  image: string | null
}
