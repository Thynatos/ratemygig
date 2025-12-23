import { Link } from 'react-router-dom'
import { Home, Music } from 'lucide-react'

export function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <Music className="w-16 h-16 text-accent-500 mb-6" />
            <h1 className="text-4xl font-display font-bold text-white mb-2">404</h1>
            <p className="text-xl text-surface-400 mb-8">Page not found</p>
            <p className="text-surface-500 mb-8 text-center max-w-md">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link to="/" className="btn-primary flex items-center gap-2">
                <Home className="w-5 h-5" />
                Back to Home
            </Link>
        </div>
    )
}
