import { useEffect } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { setUnauthorizedHandler } from '../../lib/api/client'
import { authClient } from '../../lib/auth-client'

/** Pages for signed-in users only: guests go to /sign-in */
export default function RequireAuth() {
    const { data: session, isPending } = authClient.useSession()
    const navigate = useNavigate()

    // The API answered 401 (the session ended on the server): sign out here too, then to the sign-in page. Several calls can fail
    // together: only the first one acts
    useEffect(() => {
        let signingOut = false
        setUnauthorizedHandler(() => {
            if (signingOut) return
            signingOut = true
            void authClient.signOut().finally(() => navigate('/sign-in', { replace: true }))
        })
        return () => setUnauthorizedHandler(undefined)
    }, [navigate])

    if (isPending) return null // don't flash the sign-in page while the session loads
    return session ? <Outlet /> : <Navigate to="/sign-in" replace />
}
