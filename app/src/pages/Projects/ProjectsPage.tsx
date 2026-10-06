import Card from '../../components/ui/Card'
import SeeMoreLink from '../../components/ui/SeeMoreLink'
import OpenAsPanelButton from '../../features/workspace/OpenAsPanelButton'
import { PROJECTS } from '../../mocks/projects'

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
export default function ProjectsPage() {
    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
            <h1 className="text-title">Projects</h1>
            <ul className="flex flex-col gap-2">
                {PROJECTS.map((project) => (
                    <li key={project.id}>
                        <Card variant="muted" className="flex items-center justify-between gap-2 px-4 py-3">
                            <div>
                                <p className="text-body font-medium">{project.name}</p>
                                <p className="text-small text-gray-600">{project.description}</p>
                            </div>
                            <OpenAsPanelButton panel={{ type: 'project', id: project.id }} />
                        </Card>
                    </li>
                ))}
            </ul>
            <SeeMoreLink to="/dashboard">Back to dashboard</SeeMoreLink>
        </div>
    )
}
