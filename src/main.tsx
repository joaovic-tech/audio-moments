import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Acompanha o tema claro/escuro do sistema operacional.
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => document.documentElement.classList.toggle('dark', darkQuery.matches)
applyTheme()
darkQuery.addEventListener('change', applyTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
