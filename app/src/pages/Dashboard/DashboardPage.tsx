import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { useCounter } from '../../context/CounterContext'
import { authClient } from '../../lib/auth-client'

export default function DashboardPage() {
    const { count, increment } = useCounter()
    const navigate = useNavigate()
    const { data: session } = authClient.useSession()

    const signOut = async () => {
        await authClient.signOut()
        navigate('/sign-in', { replace: true })
    }

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
            <div className="flex items-center justify-between">
                <p>
                    Signed in as {session?.user.name} ({session?.user.email})
                </p>
                <Button variant="secondary" onClick={signOut}>
                    Sign out
                </Button>
            </div>
            Ok!
            <Link to="/projects" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
                Go to projects
            </Link>
            <button onClick={increment}>Clicked {count} times</button>
            <p>Count from home page: {count}</p>
        </main>
    )
}
