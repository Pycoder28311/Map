import { useState } from 'react'
import { authClient } from '../lib/auth-client'
import { appUrl } from '../lib/urls'
import Button from './ui/Button'
import ErrorText from './ui/ErrorText'

/** One button for both sign-up and sign-in with Google */
export default function GoogleButton() {
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
            <Button variant="secondary" onClick={continueWithGoogle} disabled={loading}>
                {loading ? 'Opening Google...' : 'Continue with Google'}
            </Button>
            <ErrorText>{error}</ErrorText>
        </div>
    )
}
