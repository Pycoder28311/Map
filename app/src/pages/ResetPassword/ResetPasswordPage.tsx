import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../../components/ui/AuthLayout'
import Button from '../../components/ui/Button'
import ErrorText from '../../components/ui/ErrorText'
import TextField from '../../components/ui/TextField'
import { authClient } from '../../lib/auth-client'

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const token = params.get('token')
    const linkError = params.get('error')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const mismatch = confirm.length > 0 && password !== confirm

    const save = async (e: FormEvent) => {
        e.preventDefault()
        if (!token || password !== confirm) return
        setLoading(true)
        setError(null)
        const { error } = await authClient.resetPassword({ newPassword: password, token })
        setLoading(false)
        if (error) {
            setError(error.message ?? 'Could not reset the password')
            return
        }
        navigate('/sign-in', { replace: true })
    }

    // Opened without a valid token: expired, already used, or typed by hand
    if (!token || linkError) {
        return (
            <AuthLayout title="Link not valid">
                <p className="text-gray-600">This reset link is invalid or has expired. Please request a new one.</p>
                <Link to="/forgot-password" className="text-sm underline">
                    Request a new link
                </Link>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout title="Choose a new password">
            <form onSubmit={save} className="flex flex-col gap-4">
                <TextField
                    label="New password (min. 8 characters)"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <TextField
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />
                <ErrorText>{mismatch ? "Passwords don't match" : null}</ErrorText>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" disabled={loading || password.length < 8 || password !== confirm}>
                    {loading ? 'Saving...' : 'Save new password'}
                </Button>
            </form>
        </AuthLayout>
    )
}
