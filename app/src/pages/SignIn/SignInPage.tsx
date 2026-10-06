import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import GoogleButton from '../../components/GoogleButton'
import AuthLayout from '../../components/ui/AuthLayout'
import Button from '../../components/ui/Button'
import ErrorText from '../../components/ui/ErrorText'
import HoverLink from '../../components/ui/HoverLink'
import TextField from '../../components/ui/TextField'
import { authClient } from '../../lib/auth-client'

type Mode = 'password' | 'code-email' | 'code-enter'
type AuthError = { message?: string; code?: string } | null

const NOT_VERIFIED_MESSAGE = 'Please confirm your email first. We just sent you a new link.'

export default function SignInPage() {
    const navigate = useNavigate()
    const [mode, setMode] = useState<Mode>('password')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [otp, setOtp] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function run(action: () => Promise<{ error: AuthError }>, fallback: string) {
        setLoading(true)
        setError(null)
        const { error } = await action()
        if (error) {
            setError(error.code === 'EMAIL_NOT_VERIFIED' ? NOT_VERIFIED_MESSAGE : (error.message ?? fallback))
        }
        setLoading(false)
        return !error
    }

    const signInWithPassword = async (e: FormEvent) => {
        e.preventDefault()
        const ok = await run(() => authClient.signIn.email({ email: email.trim(), password }), 'Sign in failed')
        if (ok) navigate('/dashboard', { replace: true })
    }

    const sendCode = async (e?: FormEvent) => {
        e?.preventDefault()
        const ok = await run(
            () => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'sign-in' }),
            'Could not send the code',
        )
        if (ok) setMode('code-enter')
    }

    const signInWithCode = async (e: FormEvent) => {
        e.preventDefault()
        const ok = await run(
            () => authClient.signIn.emailOtp({ email: email.trim(), otp: otp.trim() }),
            'Invalid code',
        )
        if (ok) navigate('/dashboard', { replace: true })
    }

    const switchMode = (next: Mode) => {
        setMode(next)
        setError(null)
        setOtp('')
    }

    const emailField = (
        <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={mode === 'code-enter'}
            required
        />
    )

    return (
        <AuthLayout title="Sign in">
            {mode === 'password' && (
                <form onSubmit={signInWithPassword} className="flex flex-col gap-4">
                    {emailField}
                    <TextField
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <HoverLink to="/forgot-password">
                        Forgot password?
                    </HoverLink>
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" disabled={loading || !email.trim() || !password}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                    <Button variant="secondary" onClick={() => switchMode('code-email')}>
                        Sign in with email code
                    </Button>
                </form>
            )}

            {mode === 'code-email' && (
                <form onSubmit={sendCode} className="flex flex-col gap-4">
                    {emailField}
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" disabled={loading || !email.trim()}>
                        {loading ? 'Sending...' : 'Send code'}
                    </Button>
                    <Button variant="secondary" onClick={() => switchMode('password')}>
                        Use password instead
                    </Button>
                </form>
            )}

            {mode === 'code-enter' && (
                <form onSubmit={signInWithCode} className="flex flex-col gap-4">
                    {emailField}
                    <p className="text-body text-gray-600">
                        If an account exists for {email.trim()}, we sent a 6-digit code.
                    </p>
                    <TextField
                        label="6-digit code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                    />
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" disabled={loading || otp.trim().length !== 6}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                    <Button variant="secondary" onClick={() => sendCode()} disabled={loading}>
                        Send a new code
                    </Button>
                    <Button variant="secondary" onClick={() => switchMode('password')}>
                        Use password instead
                    </Button>
                </form>
            )}

            <GoogleButton />

            <HoverLink to="/sign-up">
                No account? Sign up
            </HoverLink>
        </AuthLayout>
    )
}
