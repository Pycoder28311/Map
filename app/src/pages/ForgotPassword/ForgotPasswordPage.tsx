import { useState, type FormEvent } from 'react'
import AuthLayout from '../../components/ui/AuthLayout'
import Button from '../../components/ui/Button'
import ErrorText from '../../components/ui/ErrorText'
import HoverLink from '../../components/ui/HoverLink'
import TextField from '../../components/ui/TextField'
import { authClient } from '../../lib/auth-client'
import { appUrl } from '../../lib/urls'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const sendLink = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await authClient.requestPasswordReset({
            email: email.trim(),
            redirectTo: appUrl('/reset-password'), // where the email link lands, with ?token=…
        })
        if (error) setError(error.message ?? 'Could not send the email')
        else setSent(true)
        setLoading(false)
    }

    return (
        <AuthLayout title="Forgot password">
            {sent ? (
                <p className="text-body text-gray-600">
                    If an account exists for {email.trim()}, we sent a link to reset your password. It&apos;s
                    valid for 1 hour.
                </p>
            ) : (
                <form onSubmit={sendLink} className="flex flex-col gap-4">
                    <p className="text-body text-gray-600">
                        Enter your email and we&apos;ll send you a link to choose a new password.
                    </p>
                    <TextField
                        label="Email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" disabled={loading || !email.trim()}>
                        {loading ? 'Sending...' : 'Send reset link'}
                    </Button>
                </form>
            )}
            <HoverLink to="/sign-in">
                Back to sign in
            </HoverLink>
        </AuthLayout>
    )
}
