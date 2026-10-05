// Used ONLY by the Better Auth CLI to generate src/db/auth-schema.ts (never at runtime).
// Keep `emailAndPassword` and `plugins` in sync with src/auth.ts: they decide the auth tables.
// Regenerate: npx @better-auth/cli generate --config better-auth.config.ts --output src/db/auth-schema.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, bearer, emailOTP } from 'better-auth/plugins'

export const auth = betterAuth({
    database: drizzleAdapter({} as never, { provider: 'sqlite' }),
    emailAndPassword: { enabled: true },
    plugins: [admin(), emailOTP({ async sendVerificationOTP() {} }), bearer()],
})
