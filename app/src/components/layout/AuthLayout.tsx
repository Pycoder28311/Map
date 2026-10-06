import type { ReactNode } from 'react'
import Card from '../ui/Card'

/** Centered card for the sign-in pages */
export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <Card variant="white" className="flex flex-col gap-4 p-6">
        <h1 className="text-heading font-semibold">{title}</h1>
        {children}
      </Card>
    </main>
  )
}
