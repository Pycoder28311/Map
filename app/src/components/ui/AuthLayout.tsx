import type { ReactNode } from 'react'

/** Centered column for the sign-in pages */
export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
    return (
        <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {children}
        </main>
    )
}
