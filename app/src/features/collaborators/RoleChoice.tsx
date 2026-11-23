import { ROLE_LABEL, type Role } from '@map/shared'
import Button from '../../components/ui/buttons/Button'

const ROLES: { value: Role; text: string }[] = [
  { value: 'reader', text: 'Can open and read it' },
  { value: 'editor', text: 'Can read and edit it' },
]

/** Read only / Author: two buttons, the chosen one kept in its hover look */
export default function RoleChoice({ value, onChange, disabled, label = 'Role' }: { value: Role; onChange: (role: Role) => void; disabled?: boolean; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {ROLES.map((r) => (
        <Button
          key={r.value}
          role="radio"
          aria-checked={value === r.value}
          variant={value === r.value ? 'selected' : 'ghost'}
          size="sm"
          plain
          title={r.text}
          disabled={disabled}
          onClick={() => value !== r.value && onChange(r.value)}
        >
          {ROLE_LABEL[r.value]}
        </Button>
      ))}
    </div>
  )
}
