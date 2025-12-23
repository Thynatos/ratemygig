import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingPage } from '@/shared/components/ui/Loading'

export function ProtectedRoute() {
    const { user, isLoading } = useAuth()
    const location = useLocation()

    if (isLoading) {
        return <LoadingPage message="Checking authentication..." />
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return <Outlet />
}
