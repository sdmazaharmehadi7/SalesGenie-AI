import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { AppearanceProvider } from '@/context/AppearanceContext'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import '@/styles/globals.css'

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <AppearanceProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </AppearanceProvider>
  </StrictMode>,
)
