import { pageQuery, type Page } from '@map/shared'
import { eq, type SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { Hono, type MiddlewareHandler } from 'hono'
import { every } from 'hono/combine'
import { z } from 'zod'
import type { SessionUser } from '../auth'
import { getDb, type Db } from '../db'
import { optionalAuth, requireAuth, requireRole, type AppEnv } from '../middleware/auth'
import { notFound, unauthorized } from './errors'
import { toPageParams, type PageParams } from './pagination'
import { parseOrThrow, validate } from './validate'

/**
 * Who may read and write a resource:
 * - owner:        signed in; each user sees and changes only their own rows (e.g. notes)
 * - public-owner: everyone reads; signed-in users create; owners change their own rows (e.g. posts)
 * - public-admin: everyone reads; only admins write (e.g. plants, blogs)
 * - admin:        only admins read and write (e.g. moderation)
 */
export type Access = 'owner' | 'public-owner' | 'public-admin' | 'admin'

/** Everything a data function needs: the database, the bindings and who is asking (null = anonymous) */
export type Ctx = { db: Db; env: CloudflareBindings; user: SessionUser | null }

/** The signed-in user's id; throws 401 when anonymous (use it in every owner filter) */
export function userId(ctx: Ctx): string {
  if (!ctx.user) throw unauthorized()
  return ctx.user.id
}

export const isAdmin = (ctx: Ctx) => ctx.user?.role === 'admin'

/** True when a partial update sets at least one field (Drizzle rejects an empty SET) */
export const hasChanges = (fields: Record<string, unknown>) => Object.values(fields).some((v) => v !== undefined)

/**
 * Condition for deleting user content: owners delete their own rows, admins any row (moderation).
 * undefined (no extra condition) for admins.
 */
export const ownedOrAdmin = (ctx: Ctx, ownerColumn: SQLiteColumn): SQL | undefined =>
  isAdmin(ctx) ? undefined : eq(ownerColumn, userId(ctx))

/**
 * The data functions a resource provides; crudRoutes() turns them into HTTP routes.
 * TFilter: parsed list filters (see crudRoutes' `filter`). TListItem: list rows when lighter than get().
 */
export type Repo<TCreate, TUpdate, TOut, TFilter = unknown, TListItem = TOut> = {
  /** page is null when the resource isn't paginated: return every row with nextCursor null */
  list: (ctx: Ctx, page: PageParams | null, filter: TFilter) => Promise<Page<TListItem>>
  get: (ctx: Ctx, id: number) => Promise<TOut | null>
  create: (ctx: Ctx, input: TCreate) => Promise<TOut>
  update: (ctx: Ctx, id: number, input: TUpdate) => Promise<TOut | null>
  remove: (ctx: Ctx, id: number) => Promise<boolean>
}

const idParam = z.object({ id: z.coerce.number().int().positive() })
const noFilter = z.object({})

const adminOnly = every(requireAuth, requireRole('admin')) as MiddlewareHandler<AppEnv>
const signedIn = requireAuth as unknown as MiddlewareHandler<AppEnv>

const guards: Record<Access, { read: MiddlewareHandler<AppEnv>; write: MiddlewareHandler<AppEnv> }> = {
  owner: { read: signedIn, write: signedIn },
  'public-owner': { read: optionalAuth, write: signedIn },
  'public-admin': { read: optionalAuth, write: adminOnly },
  admin: { read: adminOnly, write: adminOnly },
}

/** The Ctx of a request (works in crudRoutes and in hand-written routers) */
export const toCtx = (c: { env: CloudflareBindings; var: { user: SessionUser | null } }): Ctx => ({
  db: getDb(c.env),
  env: c.env,
  user: c.var.user,
})

/**
 * Standard CRUD routes for one resource:
 * GET / · GET /:id · POST / · PATCH /:id · DELETE /:id
 * Handles access, validation, pagination, 404s and status codes; the repo handles the data.
 * Paginated lists answer { items, nextCursor } and accept ?limit=&cursor=; otherwise a plain array.
 * `filter` (optional): a zod object for list query parameters, e.g. ?postId=1, passed to repo.list().
 */
export function crudRoutes<
  C extends z.ZodType,
  U extends z.ZodType,
  O,
  F extends z.ZodType = typeof noFilter,
  L = O,
>(opts: {
  access: Access
  paginate?: boolean
  create: C
  update: U
  filter?: F
  repo: Repo<z.infer<C>, z.infer<U>, O, z.infer<F>, L>
}) {
  const { repo, access, paginate = true } = opts
  const { read, write } = guards[access]
  const filter = opts.filter ?? noFilter

  return new Hono<AppEnv>()
    .get('/', read, async (c) => {
      const query = c.req.query()
      const filters = parseOrThrow(filter, query) as z.infer<F>
      if (!paginate) return c.json((await repo.list(toCtx(c), null, filters)).items)
      const page = toPageParams(parseOrThrow(pageQuery, query))
      return c.json(await repo.list(toCtx(c), page, filters))
    })
    .get('/:id', read, validate('param', idParam), async (c) => {
      const item = await repo.get(toCtx(c), c.req.valid('param').id)
      if (!item) throw notFound()
      return c.json(item)
    })
    .post('/', write, validate('json', opts.create), async (c) => {
      return c.json(await repo.create(toCtx(c), c.req.valid('json') as z.infer<C>), 201)
    })
    .patch('/:id', write, validate('param', idParam), validate('json', opts.update), async (c) => {
      const item = await repo.update(toCtx(c), c.req.valid('param').id, c.req.valid('json') as z.infer<U>)
      if (!item) throw notFound()
      return c.json(item)
    })
    .delete('/:id', write, validate('param', idParam), async (c) => {
      if (!(await repo.remove(toCtx(c), c.req.valid('param').id))) throw notFound()
      return c.body(null, 204)
    })
}
