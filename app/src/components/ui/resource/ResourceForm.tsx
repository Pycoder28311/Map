import { useRef, useState } from 'react'
import { valuesOf, type FormValues } from '../../../lib/resource/changed'
import type { AnyResource } from '../../../resources/types'
import FieldRenderer from './FieldRenderer'


type Props = {
  resource: AnyResource
  /** What the form starts with (not followed afterwards): the item, or a draft */
  initial: Record<string, unknown>
  /** Called with all the values after every change */
  onChange: (values: FormValues) => void
  /** The name of the field that gets the cursor when it opens */
  autoFocusField?: string
  className?: string
}

/** The edit form of a resource, built from its `ui.fields`: each field is the component of its kind (FieldRenderer) */
export default function ResourceForm({ resource, initial, onChange, autoFocusField, className = '' }: Props) {
  const [values, setValues] = useState<FormValues>(() => valuesOf(resource, initial))
  // The latest values, so two quick changes of different fields both stay
  const latest = useRef(values)

  const change = (name: string, value: string) => {
    const next = { ...latest.current, [name]: value }
    latest.current = next
    setValues(next)
    onChange(next)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {resource.ui.fields.map((field) => (
        <FieldRenderer key={field.name} field={field} value={values[field.name]} onChange={(value) => change(field.name, value)} autoFocus={field.name === autoFocusField} />
      ))}
    </div>
  )
}
