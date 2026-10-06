import { Navigate, Outlet } from 'react-router-dom'
import { authClient } from '../lib/auth-client'

/** Pages for signed-in users only: guests go to /sign-in */
export default function RequireAuth() {
    const { data: session, isPending } = authClient.useSession()
    if (isPending) return null // don't flash the sign-in page while the session loads
    return session ? <Outlet /> : <Navigate to="/sign-in" replace />
}
