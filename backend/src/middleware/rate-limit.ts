import { createMiddleware } from 'hono/factory'
import { errorBody } from '../lib/errors'
import type { AppEnv } from './auth'

/** Actions that send emails or check passwords: limited to AUTH_STRICT (5 per minute per IP) */
const STRICT_PATHS = new Set([
    '/api/auth/sign-in/email',
    '/api/auth/sign-up/email',
    '/api/auth/sign-in/email-otp',
    '/api/auth/email-otp/send-verification-otp',
    '/api/auth/request-password-reset',
    '/api/auth/reset-password',
    '/api/auth/send-verification-email',
])

/** Everything else under /api: API_GENERAL (120 per minute per IP) */
export const rateLimit = createMiddleware<AppEnv>(async (c, next) => {
    if (c.req.method === 'OPTIONS') return next() // browser pre-checks don't count

    const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
    const strict = c.req.method === 'POST' && STRICT_PATHS.has(c.req.path)
    const limiter = strict ? c.env.AUTH_STRICT : c.env.API_GENERAL
    const { success } = await limiter.limit({ key: strict ? `${ip}:${c.req.path}` : ip })

    if (!success) {
        return c.json(errorBody('TOO_MANY_REQUESTS', 'Too many attempts. Please wait a minute and try again.'), 429, {
            'Retry-After': '60',
        })
    }
    await next()
})
