import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string }

/** Labelled text input */
export default function TextField({ label, ...input }: Props) {
    return (
        <label className="flex flex-col gap-1 text-sm">
            {label}
            <input className="rounded border border-gray-300 px-3 py-2 text-base" {...input} />
        </label>
    )
}
