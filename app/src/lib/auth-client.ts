import { emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { SITE_URL } from '../config'
import { isDesktop } from './platform'
import { clearToken, getToken, saveToken } from './session-token'

// WEBSITE: calls its own origin + /api/auth (dev: Vite proxy to the live Worker; production: the
// Worker serves this site). The session is an HttpOnly cookie handled by the browser.
//
// DESKTOP (Tauri): pages run at tauri://localhost, so calls go to SITE_URL directly and the session
// is a bearer token: read from the `set-auth-token` response header after signing in, kept in the
// app's store, sent as `Authorization: Bearer …` on every call, removed on sign-out.
export const authClient = createAuthClient({
    plugins: [emailOTPClient()],
    ...(isDesktop && {
        baseURL: SITE_URL,
        fetchOptions: {
            credentials: 'omit' as const, // no cookies: the token is the session
            auth: { type: 'Bearer' as const, token: getToken },
            onResponse: async ({ request, response }) => {
                const token = response.headers.get('set-auth-token')
                if (token) await saveToken(token)
                if (request.url.toString().includes('/sign-out')) await clearToken()
            },
        },
    }),
})
