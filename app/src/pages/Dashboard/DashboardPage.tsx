import { LuLogOut } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import Card from '../../components/ui/Card'
import SeeMoreLink from '../../components/ui/links/SeeMoreLink'
import { useApp } from '../../context/AppContext'
import OpenAsPanelButton from '../../features/workspace/OpenAsPanelButton'
import { authClient } from '../../lib/auth-client'
import { PROJECTS } from '../../mocks/projects'

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
export default function DashboardPage() {
    const { count, increment } = useApp()
    const navigate = useNavigate()
    const { data: session } = authClient.useSession()

    const signOut = async () => {
        await authClient.signOut()
        navigate('/sign-in', { replace: true })
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-title">Dashboard</h1>
                    <p className="text-body text-fg-muted">
                        Signed in as {session?.user.name} ({session?.user.email})
                    </p>
                </div>
                <Button variant="ghost" icon={LuLogOut} onClick={signOut}>
                    Sign out
                </Button>
            </header>

            <section className="flex flex-col gap-3">
                <h2 className="text-heading">Projects</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                    {PROJECTS.map((project) => (
                        <li key={project.id}>
                            <Card variant="white" className="flex items-start justify-between gap-2 p-4">
                                <div>
                                    <p className="text-body font-medium">{project.name}</p>
                                    <p className="text-small text-fg-muted">{project.maps.length} maps</p>
                                </div>
                                {/* Any element becomes a panel with this one button */}
                                <OpenAsPanelButton panel={{ type: 'project', id: project.id }} />
                            </Card>
                        </li>
                    ))}
                </ul>
            </section>

            <Card variant="muted" className="flex flex-col gap-3 p-4">
                <p className="text-body">Count from home page: {count}</p>
                <Button variant="secondary" onClick={increment} className="self-start">
                    Clicked {count} times
                </Button>
            </Card>

            <SeeMoreLink to="/projects">Go to projects</SeeMoreLink>
        </div>
    )
}
