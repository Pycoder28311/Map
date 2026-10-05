import type { ImageRef } from '@map/shared'
import { inArray } from 'drizzle-orm'
import { images } from '../../db/schema'
import { userId, type Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownsAll } from '../../lib/relations'

/** Public URL for a stored image key */
export const imageUrl = (env: CloudflareBindings, key: string) => `${env.IMAGES_URL}/${key}`

/** Linked images (loaded with `with: { images: { with: { image: true } } }`) as clients receive them */
export const toImageRefs = (env: CloudflareBindings, links: { image: { id: number; key: string } }[]): ImageRef[] =>
  links.map(({ image }) => ({ id: image.id, url: imageUrl(env, image.key) }))

/**
 * Throws 400 UNKNOWN_IMAGE unless every newly linked image was uploaded by the signed-in user.
 * Images already linked to the item stay allowed (e.g. another admin's photos on a plant).
 */
export async function assertCanLinkImages(ctx: Ctx, ids: number[], alreadyLinked: number[] = []) {
  const added = ids.filter((id) => !alreadyLinked.includes(id))
  if (!(await ownsAll(ctx.db, images, { id: images.id, owner: images.userId }, added, userId(ctx)))) {
    throw new HttpError(400, 'UNKNOWN_IMAGE', 'Unknown image')
  }
}

/** Deletes image rows (their links cascade) and the files in R2 */
export async function deleteImages({ db, env }: Ctx, ids: number[]) {
  if (ids.length === 0) return
  const rows = await db.delete(images).where(inArray(images.id, ids)).returning()
  await env.BUCKET.delete(rows.map((img) => img.key))
}
