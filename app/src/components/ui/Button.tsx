import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }

const VARIANTS = {
    primary: 'bg-gray-900 text-white',
    secondary: 'border border-gray-300',
}

/** Button; type="button" unless set, so only the intended button submits a form */
export default function Button({ variant = 'primary', type = 'button', className = '', ...button }: Props) {
    return (
        <button
            type={type}
            className={`rounded px-4 py-2 disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
            {...button}
        />
    )
}
