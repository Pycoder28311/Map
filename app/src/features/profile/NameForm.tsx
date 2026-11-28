import { useState, type FormEvent } from 'react'
import { LuCheck } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import ErrorText from '../../components/ui/fields/ErrorText'
import TextField from '../../components/ui/fields/TextField'
import { authClient } from '../../lib/auth-client'

const MAX_NAME = 80

/** Changes the name everyone sees (Better Auth's updateUser). Save is on only when the name changed and isn't empty */
export default function NameForm({ name }: { name: string }) {
  const [value, setValue] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const trimmed = value.trim()
  const changed = trimmed !== name

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!trimmed || !changed) return
    setSaving(true)
    setError(null)
    const { error } = await authClient.updateUser({ name: trimmed })
    setSaving(false)
    if (error) setError(error.message ?? 'Could not save the name')
    else setSaved(true)
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <TextField
        label="Display name"
        autoComplete="name"
        maxLength={MAX_NAME}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
        required
      />
      <ErrorText>{error}</ErrorText>
      <div className="flex items-center justify-end gap-3">
        {saved && !changed && (
          <span role="status" className="inline-flex items-center gap-1 text-small text-fg-muted">
            <LuCheck aria-hidden className="size-4" /> Saved
          </span>
        )}
        {changed && (
          <Button variant="underline" onClick={() => setValue(name)} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving || !changed || !trimmed}>
          {saving ? 'Saving...' : 'Save name'}
        </Button>
      </div>
    </form>
  )
}
