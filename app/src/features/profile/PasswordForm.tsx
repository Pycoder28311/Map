import { useEffect, useState, type FormEvent } from 'react'
import { LuCheck } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import CheckField from '../../components/ui/fields/CheckField'
import ErrorText from '../../components/ui/fields/ErrorText'
import TextField from '../../components/ui/fields/TextField'
import { authClient } from '../../lib/auth-client'
import { appUrl } from '../../lib/urls'

/** Better Auth's default shortest password (the server checks it too) */
const MIN_PASSWORD = 8

/**
 * Changes the password (current one, the new one twice). An account made with Google has no password yet: then it offers an email
 * with a link to set one (the reset-password page, which works while signed in)
 */
export default function PasswordForm({ email }: { email: string }) {
  // null while loading; false: no email + password sign-in on this account
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    let live = true
    void authClient.listAccounts().then(({ data }) => {
      // On an error, show the form: the server answers if there is no password to change
      if (live) setHasPassword(data ? data.some((a) => a.providerId === 'credential') : true)
    })
    return () => {
      live = false
    }
  }, [])

  if (hasPassword === null) return <p className="text-body text-fg-subtle">Loading...</p>
  return hasPassword ? <ChangePassword /> : <SetPasswordByEmail email={email} />
}

function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [signOutOthers, setSignOutOthers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const mismatch = confirm.length > 0 && next !== confirm
  const ready = current && next.length >= MIN_PASSWORD && next === confirm

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setSaving(true)
    setError(null)
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: signOutOthers })
    setSaving(false)
    if (error) {
      setError(error.code === 'INVALID_PASSWORD' ? 'The current password is not right' : (error.message ?? 'Could not change the password'))
      return
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    setDone(true)
  }

  const typed = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value)
    setDone(false)
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <TextField
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={typed(setCurrent)}
        required
      />
      <TextField
        label={`New password (at least ${MIN_PASSWORD} characters)`}
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        value={next}
        onChange={typed(setNext)}
        required
      />
      <TextField
        label="Repeat the new password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={typed(setConfirm)}
        required
      />
      <CheckField label="Sign out on my other devices" checked={signOutOthers} onChange={setSignOutOthers} />
      <ErrorText>{mismatch ? 'The two new passwords are not the same' : error}</ErrorText>
      <div className="flex items-center justify-end gap-3">
        {done && (
          <span role="status" className="inline-flex items-center gap-1 text-small text-fg-muted">
            <LuCheck aria-hidden className="size-4" /> Password changed
          </span>
        )}
        <Button type="submit" disabled={saving || !ready}>
          {saving ? 'Changing...' : 'Change password'}
        </Button>
      </div>
    </form>
  )
}

function SetPasswordByEmail({ email }: { email: string }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    setError(null)
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: appUrl('/reset-password') })
    setSending(false)
    if (error) setError(error.message ?? 'Could not send the email')
    else setSent(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-fg-muted">
        You sign in with Google, so this account has no password yet. We can email you a link to set one, then you can also sign in with
        your email.
      </p>
      <ErrorText>{error}</ErrorText>
      {sent ? (
        <p role="status" className="inline-flex items-center gap-1 text-body text-fg-muted">
          <LuCheck aria-hidden className="size-4" /> Sent to {email}. The link works for an hour.
        </p>
      ) : (
        <Button variant="secondary" onClick={send} disabled={sending} className="self-end">
          {sending ? 'Sending...' : 'Email me a link'}
        </Button>
      )}
    </div>
  )
}
