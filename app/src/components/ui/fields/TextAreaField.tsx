import type { TextareaHTMLAttributes } from 'react'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-label'> & {
  /** Screen-reader name (the field shows no label of its own) */
  label: string
}

/** Borderless plain-text area that grows with its text; the box around it, if any, is the caller's. Takes everything a <textarea> takes (and `ref`) */
export default function TextAreaField({ label, rows = 1, className = '', ...textarea }: Props) {
  return (
    <textarea
      aria-label={label}
      rows={rows}
      className={`w-full resize-none bg-transparent text-body text-fg outline-none [field-sizing:content] placeholder:text-fg-subtle ${className}`}
      {...textarea}
    />
  )
}
