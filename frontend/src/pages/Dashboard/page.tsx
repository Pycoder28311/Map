import { Link } from 'react-router-dom'
import { useCounter } from '../../context/CounterContext'

export default function DashboardPage() {
    const { count, increment } = useCounter()

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
            Ok!
            <Link to="/Project" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
                Go to Project
            </Link>
            <button onClick={increment}>Clicked {count} times</button>
            <main>Count from home page: {count}</main>
        </main>
    )
}
