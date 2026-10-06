import { memo, Suspense, type ComponentType } from 'react'
import type { PanelProps } from './types'

type Props = { component: ComponentType<PanelProps>; id?: string }

/**
 * A panel's own component (from the registry), loaded lazily. Used by Pane (combined) and PanelPage
 * (alone). memo: resizing, header or layout changes around it never re-render it.
 */
const PanelContent = memo(function PanelContent({ component: Content, id }: Props) {
  return (
    <Suspense fallback={<p className="p-4 text-body text-fg-subtle">Loading…</p>}>
      <Content id={id} />
    </Suspense>
  )
})

export default PanelContent
