import { Outlet } from 'react-router-dom'
import PageDropZones from '../../features/workspace/PageDropZones'
import WorkspaceProvider from '../../features/workspace/WorkspaceProvider'
import { PANELS } from '../../panels'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

/**
 * Frame of the signed-in pages: navbar on top, sidebar on the left, the page (Outlet) beside it.
 * WorkspaceProvider lets sidebar items be dragged onto the page or the panels of /workspace.
 */
export default function AppLayout() {
    return (
        <WorkspaceProvider panels={PANELS}>
            <div className="flex h-screen flex-col">
                <Navbar />
                <div className="flex min-h-0 flex-1">
                    <Sidebar />
                    <main className="relative min-w-0 flex-1 overflow-auto bg-gray-50">
                        <Outlet />
                        <PageDropZones />
                    </main>
                </div>
            </div>
        </WorkspaceProvider>
    )
}
