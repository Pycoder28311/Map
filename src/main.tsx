import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { keepSaving, restore } from './store/persist'
import './styles.css'

// What this browser kept (the drawing and the settings), then keep saving it. Frontend only: nothing is sent anywhere
restore()
keepSaving()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
