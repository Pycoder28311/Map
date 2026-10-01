import { Link } from 'react-router-dom'
import './App.css'
import { useCounter } from './context/CounterContext'

function App() {
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

export default App
