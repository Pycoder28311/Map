import { Hono } from 'hono'
import { getDb } from '../../db'
import { images } from '../../db/schema'
import { getConfig } from '../../lib/config'
import { HttpError } from '../../lib/errors'
import { detectImageType, type ImageType } from '../../lib/image-type'
import { requireAuth, type AuthedEnv } from '../../middleware/auth'
import { imageUrl } from './images.repo'

const MAX_FILES = 10
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const EXTENSIONS: Record<ImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Not plain CRUD (multipart files), so a normal router instead of crudRoutes() */
const imagesRoutes = new Hono<AuthedEnv>()
  .use(requireAuth)
  // Upload one or more images in a single request (multipart field "files")
  .post('/', async (c) => {
    const body = await c.req.parseBody({ all: true })
    const files = [body.files].flat().filter((f): f is File => f instanceof File)

    if (files.length === 0) throw new HttpError(400, 'NO_FILES', 'No files uploaded')
    if (files.length > MAX_FILES) throw new HttpError(400, 'TOO_MANY_FILES', `Max ${MAX_FILES} files`)

    // Check every file before storing anything: size first, then its real type from its bytes
    const checked: { file: File; type: ImageType }[] = []
    for (const file of files) {
      if (file.size > MAX_SIZE) throw new HttpError(413, 'FILE_TOO_LARGE', 'Each image must be under 10 MB')
      const type = await detectImageType(file)
      if (!type) throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Only JPEG, PNG or WebP images')
      checked.push({ file, type })
    }

    const userId = c.get('user').id
    // The full key (folder included) is stored, so moving buckets only means copying files with the same keys
    const { imagesFolder } = getConfig(c.env)
    const prefix = imagesFolder ? `${imagesFolder}/` : ''
    const uploaded = await Promise.all(
      checked.map(async ({ file, type }) => {
        const key = `${prefix}img/${crypto.randomUUID()}.${EXTENSIONS[type]}`
        await c.env.BUCKET.put(key, file.stream(), {
          httpMetadata: {
            contentType: type, // the real type, not what the client claimed
            cacheControl: 'public, max-age=31536000, immutable',
          },
        })
        return { key, contentType: type, size: file.size, userId }
      }),
    )

    const rows = await getDb(c.env).insert(images).values(uploaded).returning()
    return c.json(
      rows.map((img) => ({ id: img.id, url: imageUrl(c.env, img.key) })),
      201,
    )
  })

export default imagesRoutes
