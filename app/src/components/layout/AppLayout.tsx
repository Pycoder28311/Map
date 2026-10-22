import { Outlet } from 'react-router-dom'
import { authClient } from '../../lib/auth-client'
import { ResourcesProvider } from '../../lib/resource/ResourcesProvider'
import { FocusModeProvider, useFocusMode } from '../../features/focus/FocusMode'
import ShareMode from '../../features/share/ShareMode'
import PageDropZones from '../../features/workspace/PageDropZones'
import CreateFab from '../../features/create/CreateFab'
import { ItemModalProvider } from '../../features/items/ItemModal'
import RecordRecent from '../../features/recent/RecordRecent'
import { useWorkspace } from '../../features/workspace/useWorkspace'
import WorkspaceProvider from '../../features/workspace/WorkspaceProvider'
import { PANELS } from '../../panels'
import Navbar from './Navbar'
import Sidebar from './sidebar/Sidebar'
import SidebarProvider from './sidebar/SidebarProvider'

/**
 * Frame of the signed-in pages: navbar on top, sidebar on the left, the page (Outlet) beside it.
 * SidebarProvider: the sidebar's state, shared with the navbar's ☰ button.
 * WorkspaceProvider lets sidebar items be dragged onto the page or the panels of /workspace.
 * FocusModeProvider: the navbar's Zoom hides the navbar and sidebar (they slide away).
 */
export default function AppLayout() {
    const { data: session } = authClient.useSession()
    return (
        <ResourcesProvider userId={session?.user.id}>
            <WorkspaceProvider panels={PANELS}>
                {/* What's opened, for the Dashboard's Recent column */}
                <RecordRecent />
                {/* The navbar's Share: the screen dims except what can be shared */}
                <ShareMode />
                <ItemModalProvider>
                    <FocusModeProvider>
                        <SidebarProvider>
                            <Frame />
                        </SidebarProvider>
                    </FocusModeProvider>
                </ItemModalProvider>
            </WorkspaceProvider>
        </ResourcesProvider>
    )
}

/** The navbar (slides up and away in focus mode), the sidebar and the page */
function Frame() {
    const focus = useFocusMode()
    return (
        <div className="flex h-screen flex-col">
            {/* Its height goes to nothing in focus mode (a grid row, so the popouts below it
                aren't cut while it's shown) */}
            <div
                inert={focus.on}
                style={{ gridTemplateRows: focus.on ? '0fr' : '1fr' }}
                className="relative z-30 grid shrink-0 transition-[grid-template-rows] duration-(--sidebar-duration) ease-out motion-reduce:transition-none"
            >
                <div className={focus.on ? 'min-h-0 overflow-hidden' : 'min-h-0'}>
                    <Navbar />
                </div>
            </div>
            <div className="flex min-h-0 flex-1">
                <Sidebar />
                <div className="relative min-w-0 flex-1">
                    {/* isolate: the z-indexes inside the page stay below the sidebar lying over it */}
                    <main className="relative isolate h-full overflow-auto bg-surface-muted">
                        <Outlet />
                        <PageDropZones />
                    </main>
                    {/* The floating Create button: over the page and its panes, in none of them */}
                    <CreateFab />
                    {!focus.on && <ChromeShadow />}
                </div>
            </div>
        </div>
    )
}

/**
 * The light shadow the sidebar casts on the page, along its left edge (the navbar's, along the top,
 * comes from its popout layer: PopoutLayer, one shadow with its popouts). Over the page, outside its
 * scrolling, so it never scrolls away; never takes the pointer. The workspace's panes have their own
 * frame with the same shadow (Workspace), so it isn't drawn there twice.
 */
function ChromeShadow() {
    const { onWorkspace, count } = useWorkspace()
    if (onWorkspace && count > 1) return null
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            {/* Its top edge sits above the page (cut off): only the left edge's shadow shows */}
            <div style={{ boxShadow: 'var(--chrome-shadow)' }} className="absolute inset-x-0 -top-6 bottom-0" />
        </div>
    )
}
