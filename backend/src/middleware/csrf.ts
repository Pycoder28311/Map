import { createMiddleware } from 'hono/factory'
import { getConfig } from '../lib/config'
import { HttpError } from '../lib/errors'
import type { AppEnv } from './auth'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Blocks requests that change data when a browser sends them from a website we don't trust.
 * Browsers always attach an Origin header to cross-site POST/PATCH/DELETE (including hidden
 * form submits), and websites cannot fake it. The phone app and server-to-server calls send
 * no Origin, so they are not affected (they still need a valid session).
 */
export const csrfProtection = createMiddleware<AppEnv>(async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next()
    if (c.req.path.startsWith('/api/auth/callback/')) return next() // sign-in providers post here

    const origin = c.req.header('origin')
    if (origin && !getConfig(c.env).webOrigins.includes(origin)) {
        throw new HttpError(403, 'FORBIDDEN_ORIGIN', 'Request blocked: untrusted origin.')
    }
    await next()
})
