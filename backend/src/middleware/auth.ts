import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { createAuth, type SessionData, type SessionUser } from '../auth'
import { forbidden, unauthorized } from '../lib/errors'

/** Base environment of every route: user/session are null when nobody is signed in */
export type AppEnv = {
    Bindings: CloudflareBindings
    Variables: { user: SessionUser | null; session: SessionData | null }
}

/** Environment after requireAuth: user/session are guaranteed */
export type AuthedEnv = {
    Bindings: CloudflareBindings
    Variables: { user: SessionUser; session: SessionData }
}

const loadSession = (c: Context<AppEnv>) => createAuth(c.env).api.getSession({ headers: c.req.raw.headers })

/** Public routes: sets c.get('user') when signed in, null otherwise. Never rejects. */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
    const data = await loadSession(c)
    c.set('user', data?.user ?? null)
    c.set('session', data?.session ?? null)
    await next()
})

/** Rejects requests without a valid session (401); otherwise exposes c.get('user') */
export const requireAuth = createMiddleware<AuthedEnv>(async (c, next) => {
    const data = await loadSession(c as unknown as Context<AppEnv>)
    if (!data) throw unauthorized()
    c.set('user', data.user)
    c.set('session', data.session)
    await next()
})

/** Use after requireAuth: rejects users without the given role (403) */
export const requireRole = (role: string) =>
    createMiddleware<AuthedEnv>(async (c, next) => {
        if (c.get('user').role !== role) throw forbidden()
        await next()
    })
