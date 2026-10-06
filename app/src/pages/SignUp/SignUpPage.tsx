import { useState, type FormEvent } from 'react'
import GoogleButton from '../../features/auth/GoogleButton'
import AuthLayout from '../../components/layout/AuthLayout'
import Button from '../../components/ui/buttons/Button'
import ErrorText from '../../components/ui/fields/ErrorText'
import HoverLink from '../../components/ui/links/HoverLink'
import TextField from '../../components/ui/fields/TextField'
import { authClient } from '../../lib/auth-client'
import { appUrl } from '../../lib/urls'

export default function SignUpPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const signUp = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            callbackURL: appUrl('/dashboard'), // where the confirmation link brings them back
        })
        if (error) setError(error.message ?? 'Sign up failed')
        else setSent(true)
        setLoading(false)
    }

    if (sent) {
        return (
            <AuthLayout title="Check your email">
                <p className="text-body text-fg-muted">
                    We sent a confirmation link to {email.trim()}. Open it to finish signing up.
                </p>
                <HoverLink to="/sign-in">
                    Back to sign in
                </HoverLink>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout title="Create account">
            <form onSubmit={signUp} className="flex flex-col gap-4">
                <TextField
                    label="Name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <TextField
                    label="Password (min. 8 characters)"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <ErrorText>{error}</ErrorText>
                <Button type="submit" disabled={loading || !name.trim() || !email.trim() || password.length < 8}>
                    {loading ? 'Creating account...' : 'Sign up'}
                </Button>
            </form>

            <GoogleButton />

            <HoverLink to="/sign-in">
                Already have an account? Sign in
            </HoverLink>
        </AuthLayout>
    )
}
