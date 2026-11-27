import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { keepSaving, restore } from './store/library'
import './styles.css'

// The asset library this browser kept (or the default assets), then keep saving the open one. Frontend only: nothing is sent anywhere
restore()
keepSaving()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
