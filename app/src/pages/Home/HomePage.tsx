import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react';
import { useCounter } from '../../context/CounterContext'

export default function HomePage() {
  const { count, increment } = useCounter()

  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:8787/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message));
  }, []);

  return (
    <>
      Test
      <a href="https://github.com/Pycoder28311/Map/releases/download/test01/frontend-0.1.0-1.x86_64.rpm">
        Download Map for Fedora
      </a>

      <button onClick={increment}>Clicked {count} times</button>
      <p>s{message}</p>
      <Link to="/dashboard">Go to dashboard</Link>
    </>
  )
}
