import type { ReactNode } from 'react'

/** The editor's right sidebar: docked beside the board (it pushes the board over, never floats on it), scrolls on its own. `wide`: the point's, which has more to write in */
export default function SidePanel({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <aside aria-label={label} className={`flex ${wide ? 'w-104' : 'w-80'} shrink-0 flex-col gap-3 overflow-y-auto border-s border-line bg-surface p-3`}>
      {children}
    </aside>
  )
}
