import { Link } from 'react-router-dom'
import { useCounter } from '../../context/CounterContext'

export default function HomePage() {
  const { count, increment } = useCounter()

  return (
    <>
      Test
      <a href="https://github.com/Pycoder28311/Map/releases/download/test01/frontend-0.1.0-1.x86_64.rpm">
        Download Map for Fedora
      </a>

      <button onClick={increment}>Clicked {count} times</button>
      <Link to="/dashboard">Go to dashboard</Link>
    </>
  )
}
