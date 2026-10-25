import { useState } from 'react'
import { LuEye, LuEyeOff, LuLogOut } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import DashboardBackground, { DASHBOARD_SHADE } from '../../features/dashboard/DashboardBackground'
import DashboardGrid from '../../features/dashboard/DashboardGrid'
import DashboardRelics from '../../features/dashboard/DashboardRelics'
import EditIconsPreview from '../../features/dashboard/EditIconsPreview'
import QuillIconsPreview from '../../features/dashboard/QuillIconsPreview'
import DashboardColumns from '../../features/dashboard/DashboardColumns'
import DashboardSections from '../../features/dashboard/DashboardSections'
import { useDashboardColumns } from '../../features/dashboard/useDashboardColumns'
import QuickCreate from '../../features/notes/QuickCreate'
import { authClient } from '../../lib/auth-client'

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
/**
 * The main page: the quick note input, three columns (Recent, Notes, Maps by default; each can show
 * another list), and under them a row of cards per project (its items) and an Orphans row
 */
export default function DashboardPage() {
    const navigate = useNavigate()
    const { data: session } = authClient.useSession()
    const columns = useDashboardColumns()
    const [showIcons, setShowIcons] = useState(false)
    const firstName = session?.user.name?.split(/\s+/)[0]

    const signOut = async () => {
        await authClient.signOut()
        navigate('/sign-in', { replace: true })
    }

    return (
        <div className="relative min-h-full">
            {/* The picture behind everything, under a dark layer */}
            <DashboardBackground />
            {/* A faint dot grid over it (a theme turns it on) */}
            <DashboardGrid />
            <div style={{ filter: DASHBOARD_SHADE }} className="relative mx-auto flex max-w-[65rem] flex-col gap-12 px-4 pt-8 pb-24">
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        icon={showIcons ? LuEyeOff : LuEye}
                        onClick={() => setShowIcons((v) => !v)}
                        aria-pressed={showIcons}
                    >
                        {showIcons ? 'Hide icons' : 'Show icons'}
                    </Button>
                </div>
                {showIcons && (
                    <>
                        {/* Pixel-art items along the top (a theme turns them on) */}
                        <DashboardRelics />
                        {/* TEMPORARY: the quill icons to choose from */}
                        <QuillIconsPreview />
                        {/* TEMPORARY: the pencil / edit / create icons to choose from */}
                        <EditIconsPreview />
                    </>
                )}
                {/* The input and the columns share one narrower width, centred over the sections */}
                <div className="mx-auto flex w-full max-w-[54rem] flex-col gap-10">
                    {/* A greeting, then the page's main input, low on the screen with room above them */}
                    <div className="mt-[18vh] flex flex-col items-center gap-12">
                        <h1 className="text-center text-5xl font-semibold tracking-tight">Hello{firstName ? `, ${firstName}` : ''}</h1>
                        <div className="w-full">
                            <QuickCreate />
                        </div>
                    </div>
                    <DashboardColumns {...columns} />
                </div>

                <DashboardSections />

                <footer className="flex items-center justify-between gap-4 border-t border-line pt-4">
                    <p className="text-body text-fg-muted">
                        Signed in as {session?.user.name} ({session?.user.email})
                    </p>
                    <Button variant="ghost" icon={LuLogOut} onClick={signOut}>
                        Sign out
                    </Button>
                </footer>
            </div>
        </div>
    )
}
