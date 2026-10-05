// PROJECT file: which sign-in methods this app offers. Settings come from lib/config + lib/env.
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, bearer, emailOTP } from 'better-auth/plugins'
import { getDb } from './db'
import * as schema from './db/schema'
import { resetPasswordEmail, signInCodeEmail, verifyEmail } from './emails'
import { getConfig } from './lib/config'
import { sendEmail } from './lib/email'
import { getEnv } from './lib/env'

const buildAuth = (env: CloudflareBindings) => {
    const e = getEnv(env)
    const config = getConfig(env)

    return betterAuth({
        database: drizzleAdapter(getDb(env), { provider: 'sqlite', schema }),
        secret: e.BETTER_AUTH_SECRET,
        baseURL: e.BETTER_AUTH_URL,
        session: {
            cookieCache: { enabled: true, maxAge: 5 * 60 },
        },
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: true, // no password sign-in until the email is confirmed
            resetPasswordTokenExpiresIn: 60 * 60, // link valid for 1 hour
            revokeSessionsOnPasswordReset: true, // sign out everywhere after a reset
            async sendResetPassword({ user, url }) {
                await sendEmail(env, { to: user.email, ...resetPasswordEmail(config, url) })
            },
        },
        emailVerification: {
            sendOnSignUp: true, // email a confirmation link right after sign-up
            sendOnSignIn: true, // send a new link if an unverified user tries to sign in
            autoSignInAfterVerification: true, // the link also signs them in
            async sendVerificationEmail({ user, url }) {
                await sendEmail(env, { to: user.email, ...verifyEmail(config, url) })
            },
        },
        // Google sign-in only when both keys are configured
        socialProviders:
            e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
                ? {
                      google: {
                          clientId: e.GOOGLE_CLIENT_ID,
                          clientSecret: e.GOOGLE_CLIENT_SECRET,
                          prompt: 'select_account', // let users pick which Google account to use
                      },
                  }
                : {},
        plugins: [
            admin(), // user.role ("user" by default, "admin"), bans, impersonation
            emailOTP({
                otpLength: 6,
                expiresIn: 10 * 60,
                disableSignUp: true, // codes only sign in existing accounts
                async sendVerificationOTP({ email, otp, type }) {
                    if (type !== 'sign-in') return
                    await sendEmail(env, { to: email, ...signInCodeEmail(config, otp) })
                },
            }),
            // Desktop app (Tauri): session token in the Authorization header instead of a cookie.
            // Sign-in answers carry it in the `set-auth-token` header (exposed by CORS in index.ts).
            bearer(),
        ],
        trustedOrigins: config.trustedOrigins,
        advanced: {
            // Website and API share one site; the desktop app uses bearer tokens, not cookies
            defaultCookieAttributes: { sameSite: 'lax', secure: true },
        },
    })
}

export type Auth = ReturnType<typeof buildAuth>
export type SessionUser = Auth['$Infer']['Session']['user']
export type SessionData = Auth['$Infer']['Session']['session']

const cache = new WeakMap<object, Auth>()

/** The Better Auth instance, built once per isolate (same caching as getEnv/getConfig) */
export function createAuth(env: CloudflareBindings): Auth {
    let auth = cache.get(env)
    if (!auth) {
        auth = buildAuth(env)
        cache.set(env, auth)
    }
    return auth
}
