import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { ToastProvider } from '@/shared/components/ui/Toast'
import { queryClient } from '@/shared/lib/queryClient'
import { initMonitoring } from '@/shared/lib/monitoring'
import App from '@/app/App'
import './index.css'

initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
    <Analytics />
  </StrictMode>,
)
