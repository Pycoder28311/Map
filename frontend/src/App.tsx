import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      Test
      <a href="https://github.com/Pycoder28311/Map/releases/download/test/frontend-0.1.0-1.x86_64.rpm">
        <button>Download Map for Fedora</button>
      </a>
    </>
  )
}

export default App
