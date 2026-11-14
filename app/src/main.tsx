import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
// The Panel button's font (the floating Create button, styles/buttons.css)
import '@fontsource/jacquard-24'
// The framed Venom button's pixel font (styles/buttons.css)
import '@fontsource/pixelify-sans/500.css'
// The Dashboard's article cards' pixel font (styles/bloodCard.css)
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/600.css'
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
