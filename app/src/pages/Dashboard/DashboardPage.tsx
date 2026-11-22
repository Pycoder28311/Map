import { useState } from 'react'
import { LuEye, LuEyeOff, LuLogOut } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import DashboardRelics from '../../features/dashboard/DashboardRelics'
import EditIconsPreview from '../../features/dashboard/EditIconsPreview'
import QuillIconsPreview from '../../features/dashboard/QuillIconsPreview'
import BigCreateButton, { BIG_BUTTON_W } from '../../features/dashboard/BigCreateButton'
import NightBackdrop from '../../features/dashboard/NightBackdrop'
import { STONE_PIXEL } from '../../features/dashboard/stoneButton'
import DashboardSections from '../../features/dashboard/DashboardSections'
import QuickCreate from '../../features/notes/QuickCreate'
import { authClient } from '../../lib/auth-client'

/** The two big Create buttons side by side (px): their width each and the gap between them (gap-6). The note input is as wide */
const TWO_BUTTONS = 2 * BIG_BUTTON_W * STONE_PIXEL + 24
/** How far in from the buttons' outer edges the note input stops, on each side (px) */
const INPUT_INSET = 32
/** How much shorter the note input is at its top (px; QuickCreate's tall box is this much shorter): its top comes down, its bottom stays */
const INPUT_LOWER = 16
/** The shadow and thickness each button's slab shows past its stone on its right (px: three of its pixels): the input is centred on the
 *  stone you see, so it is this much narrower and half of it further left */
const BUTTON_SHADOW = 3 * STONE_PIXEL

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
/**
 * The main page: the greeting and the quick note input, the two big Create buttons (Create article, Create map) under them (the
 * Recent / Notes / Maps columns are hidden: DashboardColumns), and under that a row of cards per project (its items) and an Orphans row
 */
export default function DashboardPage() {
    const navigate = useNavigate()
    const { data: session } = authClient.useSession()
    const [showIcons, setShowIcons] = useState(false)
    const firstName = session?.user.name?.split(/\s+/)[0]

    const signOut = async () => {
        await authClient.signOut()
        navigate('/sign-in', { replace: true })
    }

    return (
        <div className="relative min-h-full">
            {/* The pixel-art dusk behind it all (dark theme) */}
            <NightBackdrop />
            <div className="relative mx-auto flex max-w-[65rem] flex-col gap-12 px-4 pt-8 pb-24">
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
                {/* The input and the Create buttons share one narrower width, centred over the sections */}
                <div className="mx-auto flex w-full max-w-[54rem] flex-col gap-5">
                    {/* A greeting, then the page's main input and the Create buttons, near the top of the screen */}
                    <div className="mt-[4vh] flex flex-col items-center gap-6">
                        <h1 className="text-center text-5xl font-semibold tracking-tight">Hello{firstName ? `, ${firstName}` : ''}</h1>
                        {/* A little narrower than the two Create buttons under it (INPUT_INSET in from each side) */}
                        <div className="relative w-full" style={{ maxWidth: TWO_BUTTONS - 2 * INPUT_INSET - BUTTON_SHADOW, left: -BUTTON_SHADOW / 2, marginTop: INPUT_LOWER }}>
                            <QuickCreate tall />
                        </div>
                    </div>
                    {/* The two big Create buttons, side by side under the input (they open the Create modal on its Article and Map tabs) */}
                    <div className="mx-auto flex w-full items-start justify-center gap-6" style={{ maxWidth: TWO_BUTTONS }}>
                        <BigCreateButton lines={['Create', 'article']} art="article" kind="articles" />
                        <BigCreateButton lines={['Create', 'map']} art="map" kind="maps" />
                    </div>
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
