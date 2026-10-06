import { Navigate, Outlet } from 'react-router-dom'
import { authClient } from '../../lib/auth-client'

/** Pages for guests only (sign in, sign up, forgot password): signed-in users go to /dashboard */
export default function GuestOnly() {
    const { data: session, isPending } = authClient.useSession()
    if (isPending) return null
    return session ? <Navigate to="/dashboard" replace /> : <Outlet />
}
