import type { ComponentType } from 'react'
import type { AnyField, FieldWidget } from '../../../resources/types'
import RichTextField from '../fields/RichTextField'
import TextAreaField from '../fields/TextAreaField'

export type WidgetProps = {
  /** The value the field starts with (not followed afterwards: the field owns it while it is open) */
  value: string
  onChange: (value: string) => void
  /** Screen-reader name */
  label: string
  placeholder?: string
  autoFocus?: boolean
  heading?: boolean
}

function TextWidget({ value, onChange, label, placeholder, autoFocus, heading }: WidgetProps) {
  return (
    <input
      data-autofocus={autoFocus || undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className={`w-full bg-transparent outline-none placeholder:text-fg-subtle ${heading ? 'text-heading' : 'text-body'}`}
    />
  )
}

function TextAreaWidget({ value, onChange, label, placeholder, autoFocus }: WidgetProps) {
  return <TextAreaField value={value} onChange={(e) => onChange(e.target.value)} label={label} placeholder={placeholder} rows={3} data-autofocus={autoFocus || undefined} />
}

function RichTextWidget({ value, onChange, label, placeholder, autoFocus }: WidgetProps) {
  return <RichTextField value={value} onChange={onChange} label={label} placeholder={placeholder} autoFocus={autoFocus} toolbar />
}

/** One component per kind of field. A new kind: add its name to FIELD_WIDGET_NAMES (resources/types.ts) and its component here */
export const FIELD_WIDGETS: Record<FieldWidget, ComponentType<WidgetProps>> = {
  text: TextWidget,
  textarea: TextAreaWidget,
  richText: RichTextWidget,
}

type Props = {
  field: AnyField
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

/** A field of a resource's form: the component of its kind */
export default function FieldRenderer({ field, value, onChange, autoFocus }: Props) {
  const Widget = FIELD_WIDGETS[field.widget]
  return <Widget value={value} onChange={onChange} label={field.label ?? field.name} placeholder={field.placeholder} heading={field.heading} autoFocus={autoFocus} />
}
