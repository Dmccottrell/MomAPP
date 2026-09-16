import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initTheme } from './utils/theme'
import { initAccent } from './utils/accent'
import { initTextSize } from './utils/textSize'

// Applied before the first render so there's no flash of the wrong
// theme, accent color, or text size.
initTheme()
initAccent()
initTextSize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
