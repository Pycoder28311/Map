import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
// The Panel button's font (the floating Create button, styles/buttons.css)
import '@fontsource/jacquard-24'
import { AppProvider } from './context/AppContext'
import './index.css'
import AppRoutes from './routes'
import { applyRockEdge } from './components/ui/buttons/rockEdge'
import { installNumberScrub } from './components/ui/fields/numberScrub'
import { applyTheme } from './lib/theme'

applyTheme()
// The Stone buttons' rocky border (components/ui/buttons/rockEdge.ts)
applyRockEdge()
installNumberScrub()

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProvider>,
)
