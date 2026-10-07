import { Outlet } from 'react-router-dom'
import PageDropZones from '../../features/workspace/PageDropZones'
import WorkspaceProvider from '../../features/workspace/WorkspaceProvider'
import { PANELS } from '../../panels'
import Navbar from './Navbar'
import Sidebar from './sidebar/Sidebar'
import SidebarProvider from './sidebar/SidebarProvider'

/**
 * Frame of the signed-in pages: navbar on top, sidebar on the left, the page (Outlet) beside it.
 * SidebarProvider: the sidebar's state, shared with the navbar's ☰ button.
 * WorkspaceProvider lets sidebar items be dragged onto the page or the panels of /workspace.
 */
export default function AppLayout() {
    return (
        <WorkspaceProvider panels={PANELS}>
            <SidebarProvider>
                <div className="flex h-screen flex-col">
                    <Navbar />
                    <div className="flex min-h-0 flex-1">
                        <Sidebar />
                        {/* isolate: the z-indexes inside the page stay below the sidebar lying over it */}
                        <main className="relative isolate min-w-0 flex-1 overflow-auto bg-surface-muted">
                            <Outlet />
                            <PageDropZones />
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </WorkspaceProvider>
    )
}
