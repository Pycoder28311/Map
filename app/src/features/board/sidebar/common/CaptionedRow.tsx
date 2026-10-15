import type { ReactNode } from 'react'

type Props = {
  /** Left to right: the small title above the input, and the input */
  fields: { label: string; node: ReactNode }[]
  /** The first column's width (a colour swatch); the others share what is left */
  first?: string
}

/** A row of inputs, each with its name in small text above it */
export default function CaptionedRow({ fields, first = '4rem' }: Props) {
  return (
    <div className="grid gap-x-1 gap-y-0.5" style={{ gridTemplateColumns: `${first} repeat(${fields.length - 1}, minmax(0, 1fr))` }}>
      {fields.map((f) => (
        <span key={`${f.label}-title`} className="text-small text-fg-muted">
          {f.label}
        </span>
      ))}
      {fields.map((f) => (
        <div key={`${f.label}-input`} className="flex min-w-0 items-stretch [&>*]:flex-1">
          {f.node}
        </div>
      ))}
    </div>
  )
}
