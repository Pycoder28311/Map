import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { authClient } from '../lib/auth-client'
import { isDesktop } from '../lib/platform'
import { appUrl } from '../lib/urls'
import Button from './ui/Button'
import ErrorText from './ui/ErrorText'

/** One button for both sign-up and sign-in with Google (website only, see below) */
export default function GoogleButton() {
    // Desktop: Google blocks sign-in inside embedded windows. It needs the system browser and a
    // deep link back to the app (separate plan), so the button is hidden there for now.
    if (isDesktop) return null
    return <GoogleButtonWeb />
}

function GoogleButtonWeb() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const continueWithGoogle = async () => {
        setLoading(true)
        setError(null)
        const { error } = await authClient.signIn.social({
            provider: 'google',
            callbackURL: appUrl('/dashboard'), // the browser leaves for Google and comes back here
        })
        if (error) setError(error.message ?? 'Google sign-in failed')
        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-2">
            <Button variant="secondary" icon={FcGoogle} onClick={continueWithGoogle} disabled={loading}>
                {loading ? 'Opening Google...' : 'Continue with Google'}
            </Button>
            <ErrorText>{error}</ErrorText>
        </div>
    )
}
