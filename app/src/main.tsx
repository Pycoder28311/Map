import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CounterProvider } from './context/CounterContext'
import './index.css'
import AppRoutes from './routes'

createRoot(document.getElementById('root')!).render(
  <CounterProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </CounterProvider>,
)
