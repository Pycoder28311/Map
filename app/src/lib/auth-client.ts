import { emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// No baseURL: calls go to this page's own origin + /api/auth.
// Dev: the Vite proxy forwards them to the live Worker. Production: the Worker serves this site.
export const authClient = createAuthClient({
    plugins: [emailOTPClient()],
})
