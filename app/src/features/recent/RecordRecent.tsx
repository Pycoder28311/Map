import { useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { useLayoutsState } from '../../mocks/layoutsStore'
import { workspaceHref } from '../workspace/layout'
import { useWorkspace } from '../workspace/useWorkspace'
import { entryForLayout, entryForSavedLayout, recordRecent } from './recentStore'

/**
 * Records what's opened (for the Dashboard's Recent column). Everything that opens something
 * navigates, so watching what's on screen catches it all: a page, an object, a combination of panes.
 * Panes opened from a saved layout's tile are recorded as that layout. Renders nothing; put it once
 * inside WorkspaceProvider (AppLayout).
 */
export default function RecordRecent() {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  const { layout, onWorkspace } = useWorkspace()
  const { selectedId } = useLayoutsState()
  const key = layout ? workspaceHref(layout) : ''

  useEffect(() => {
    if (!userId || !layout) return
    const fromSaved = selectedId !== null && onWorkspace && layout.panels.length >= 2
    const entry = fromSaved ? entryForSavedLayout(selectedId, Date.now()) : entryForLayout(layout, Date.now())
    if (entry) recordRecent(userId, entry)
    // Only when what's on screen (or the selected layout) changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, selectedId, userId])

  return null
}
