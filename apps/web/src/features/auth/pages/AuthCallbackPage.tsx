import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoadingPage } from '@/shared/components/ui/Loading'

export function AuthCallbackPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        // The Supabase client automatically handles the callback
        // Just redirect to the intended destination or home
        const next = searchParams.get('next') || '/'

        // Give the auth state time to update
        const timeout = setTimeout(() => {
            navigate(next, { replace: true })
        }, 1000)

        return () => clearTimeout(timeout)
    }, [navigate, searchParams])

    return <LoadingPage message="Signing you in" />
}
