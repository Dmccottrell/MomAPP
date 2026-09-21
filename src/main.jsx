import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initTheme } from './utils/theme'
import { initAccent } from './utils/accent'
import { initTextSize } from './utils/textSize'
import { initDensity } from './utils/density'
import { initCornerRadius } from './utils/cornerRadius'
import { initMotion } from './utils/motion'
import { initHighContrast } from './utils/contrast'

// Applied before the first render so there's no flash of the wrong
// appearance settings.
initTheme()
initAccent()
initTextSize()
initDensity()
initCornerRadius()
initMotion()
initHighContrast()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
