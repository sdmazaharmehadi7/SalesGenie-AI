import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { AppearanceProvider } from '@/context/AppearanceContext'
import { AuthProvider } from '@/context/AuthContext'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { ToastProvider } from '@/context/ToastContext'
import '@/styles/globals.css'

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <AppearanceProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </AppearanceProvider>
  </StrictMode>,
)
