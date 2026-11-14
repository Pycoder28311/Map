import { useState } from 'react'
import { LuLogOut } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import ResourceCreateDialog from '../../components/ui/resource/ResourceCreateDialog'
import NotesShelf from '../../features/dashboard/project/NotesShelf'
import ProjectBoards from '../../features/dashboard/project/ProjectBoards'
import QuickCreate from '../../features/notes/QuickCreate'
import { authClient } from '../../lib/auth-client'
import { resourceByName } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'

const ARTICLES = resourceByName('articles')
const MAPS = resourceByName('maps')

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
/**
 * The main page: the note input, a Create article and a Create map button under it, the notes (each on old paper), then a block per project (its name, then its
 * articles and the maps side by side: ProjectBoards), and the signed-in line at the bottom
 */
export default function DashboardPage() {
    const navigate = useNavigate()
    const { data: session } = authClient.useSession()
    const [creating, setCreating] = useState<AnyResource | null>(null)

    const signOut = async () => {
        await authClient.signOut()
        navigate('/sign-in', { replace: true })
    }

    return (
        <div className="relative min-h-full">
            <div className="relative mx-auto flex max-w-[72rem] flex-col gap-12 px-4 pt-8 pb-24">
                {/* The note input and the two Create buttons, centred, low on the screen with room above them */}
                <div className="mx-auto mt-[14vh] flex w-full max-w-[34rem] flex-col items-center gap-5">
                    <div className="w-full">
                        <QuickCreate />
                    </div>
                    <div className="grid w-full grid-cols-2 gap-3">
                        {ARTICLES && (
                            <Button variant="create" icon={ARTICLES.ui.icon} onClick={() => setCreating(ARTICLES)} className="w-full justify-center">
                                Create article
                            </Button>
                        )}
                        {MAPS && (
                            <Button variant="create" icon={MAPS.ui.icon} onClick={() => setCreating(MAPS)} className="w-full justify-center">
                                Create map
                            </Button>
                        )}
                    </div>
                </div>

                <NotesShelf />

                <ProjectBoards />

                <footer className="flex items-center justify-between gap-4 border-t border-line pt-4">
                    <p className="text-body text-fg-muted">
                        Signed in as {session?.user.name} ({session?.user.email})
                    </p>
                    <Button variant="ghost" icon={LuLogOut} onClick={signOut}>
                        Sign out
                    </Button>
                </footer>
            </div>
            {creating && <ResourceCreateDialog resource={creating} onClose={() => setCreating(null)} />}
        </div>
    )
}
