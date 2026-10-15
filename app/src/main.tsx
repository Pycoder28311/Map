import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import { AppProvider } from './context/AppContext'
import './index.css'
import AppRoutes from './routes'
import { installNumberScrub } from './components/ui/fields/numberScrub'

installNumberScrub()

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProvider>,
)
