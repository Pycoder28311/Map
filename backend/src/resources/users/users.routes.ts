import { Hono } from 'hono'
import { z } from 'zod'
import { getDb } from '../../db'
import { user } from '../../db/schema'
import { errorBody, notFound } from '../../lib/errors'
import { validate } from '../../lib/validate'
import { requireAuth, type AuthedEnv } from '../../middleware/auth'
import { eq } from 'drizzle-orm'

const lookupQuery = z.object({ email: z.email().max(254).transform((email) => email.trim().toLowerCase()) })

/**
 * GET /api/users/lookup?email=: the person with exactly this email (the privacy panel adds them), as { id, name, image }, never their
 * email; 404 when there is none (or it is the caller). One read through the email's unique index. Limited per user (USER_LOOKUP), so
 * nobody can test many emails for an account
 */
const usersRoutes = new Hono<AuthedEnv>()
  .use(requireAuth)
  .get('/lookup', async (c, next) => {
    const { success } = await c.env.USER_LOOKUP.limit({ key: c.get('user').id })
    if (!success) return c.json(errorBody('TOO_MANY_REQUESTS', 'Too many searches. Please wait a minute and try again.'), 429, { 'Retry-After': '60' })
    await next()
  })
  .get('/lookup', validate('query', lookupQuery), async (c) => {
    const { email } = c.req.valid('query')
    const found = await getDb(c.env).select({ id: user.id, name: user.name, image: user.image }).from(user).where(eq(user.email, email)).get()
    if (!found || found.id === c.get('user').id) throw notFound('Nobody with this email')
    return c.json(found)
  })

export default usersRoutes
