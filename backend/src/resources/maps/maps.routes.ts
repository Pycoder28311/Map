import { BOARD_FILE_MAX, DATA, entityId, FILE_VERSION_HEADER } from '@map/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { toCtx } from '../../lib/crud'
import { HttpError, notFound } from '../../lib/errors'
import { validate } from '../../lib/validate'
import { requireAuth, type AuthedEnv } from '../../middleware/auth'
import { copyMapFile, createBranch, mapRow, saveMapFile } from './maps.repo'

const idParam = z.object({ id: z.coerce.number().int().positive() })
const saveQuery = z.object({ baseVersion: z.coerce.number().int().min(0) })
const copyBody = z.object({ from: entityId })

const tooBig = () => new HttpError(413, 'FILE_TOO_LARGE', `A map's file must be under ${BOARD_FILE_MAX / 1024 / 1024} MB`)

/** The body's bytes, refused when it is too big (by its Content-Length first, before reading it) or empty */
async function fileBytes(declared: string | undefined, read: () => Promise<ArrayBuffer>) {
  if (Number(declared ?? 0) > BOARD_FILE_MAX) throw tooBig()
  const bytes = await read()
  if (bytes.byteLength > BOARD_FILE_MAX) throw tooBig()
  if (bytes.byteLength === 0) throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'file', message: 'Empty file' }])
  return bytes
}

/**
 * A map's board file (docs/plans/38), in the private BOARDS bucket, the owner's only (the rest of /api/maps is the generic CRUD):
 * - GET /:id/file: the file's bytes and its version (X-File-Version); 204 for a map never saved
 * - PUT /:id/file?baseVersion=: a new file over that version; 409 when another was saved since
 * - POST /:id/branches (multipart `title`, `file`): a branch with this file
 * - POST /:id/file/copy { from }: Duplicate's copy of another map's file
 * The file's contents are not read here: only its size is checked
 */
const mapsFileRoutes = new Hono<AuthedEnv>()
  .get('/:id/file', requireAuth, validate('param', idParam), async (c) => {
    const row = await mapRow(toCtx(c), c.req.valid('param').id)
    if (!row) throw notFound('Map not found')
    const headers = { [FILE_VERSION_HEADER]: String(row.fileVersion), 'Cache-Control': 'private, no-store' }
    if (!row.fileKey) return c.body(null, 204, headers)
    const object = await c.env.BOARDS.get(row.fileKey)
    if (!object) return c.body(null, 204, headers)
    return new Response(object.body, { headers: { ...headers, 'Content-Type': 'application/octet-stream' } })
  })
  .put('/:id/file', requireAuth, validate('param', idParam), validate('query', saveQuery), async (c) => {
    const bytes = await fileBytes(c.req.header('content-length'), () => c.req.arrayBuffer())
    return c.json(await saveMapFile(toCtx(c), c.req.valid('param').id, c.req.valid('query').baseVersion, bytes))
  })
  .post('/:id/branches', requireAuth, validate('param', idParam), async (c) => {
    const body = await c.req.parseBody()
    const title = DATA.maps.fields.title.zod.safeParse(body.title)
    if (!title.success || !title.data) throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'title', message: 'Needs a title' }])
    const file = body.file
    if (!(file instanceof File)) throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'file', message: 'Missing file' }])
    const bytes = await fileBytes(String(file.size), () => file.arrayBuffer())
    return c.json(await createBranch(toCtx(c), c.req.valid('param').id, title.data as string, bytes), 201)
  })
  .post('/:id/file/copy', requireAuth, validate('param', idParam), validate('json', copyBody), async (c) => {
    const copied = await copyMapFile(toCtx(c), c.req.valid('param').id, c.req.valid('json').from)
    return copied ? c.json(copied) : c.body(null, 204)
  })

export default mapsFileRoutes
