import { Link, Outlet, useLocation } from 'react-router-dom'
import { Music, Calendar, MapPin, Users, User, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/utils'

const NAV_LINKS = [
    { to: '/', label: 'Discover', icon: Calendar },
    { to: '/venues', label: 'Venues', icon: MapPin },
    { to: '/artists', label: 'Artists', icon: Users },
]

export function Layout() {
    const { user, signOut, isLoading } = useAuth()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/'
        return location.pathname.startsWith(path)
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-surface-900/80 backdrop-blur-xl border-b border-surface-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link
                            to="/"
                            className="flex items-center gap-2 text-xl font-display font-bold text-white hover:text-primary-400 transition-colors"
                        >
                            <Music className="w-7 h-7 text-accent-500" />
                            <span className="text-gradient">ratemygig</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={cn(
                                        'nav-link flex items-center gap-2',
                                        isActive(to) && 'active'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </Link>
                            ))}
                        </nav>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            {isLoading ? (
                                <div className="w-8 h-8 skeleton rounded-full" />
                            ) : user ? (
                                <>
                                    <Link
                                        to="/my-gigs"
                                        className={cn(
                                            'hidden md:flex nav-link items-center gap-2',
                                            isActive('/my-gigs') && 'active'
                                        )}
                                    >
                                        <Calendar className="w-4 h-4" />
                                        My Gigs
                                    </Link>
                                    <Link
                                        to="/profile"
                                        className="btn-icon"
                                        title="Profile"
                                    >
                                        <User className="w-5 h-5" />
                                    </Link>
                                    <button
                                        onClick={() => signOut()}
                                        className="btn-icon"
                                        title="Sign out"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <Link to="/login" className="btn-primary text-sm">
                                    Sign In
                                </Link>
                            )}

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden btn-icon"
                            >
                                {mobileMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-surface-800 bg-surface-900/95 animate-slide-down">
                        <nav className="px-4 py-4 space-y-2">
                            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                                        isActive(to)
                                            ? 'bg-primary-500/10 text-primary-400'
                                            : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                            {user && (
                                <Link
                                    to="/my-gigs"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                                        isActive('/my-gigs')
                                            ? 'bg-primary-500/10 text-primary-400'
                                            : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
                                    )}
                                >
                                    <Calendar className="w-5 h-5" />
                                    My Gigs
                                </Link>
                            )}
                        </nav>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-surface-800 bg-surface-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-surface-400">
                            <Music className="w-5 h-5 text-accent-500" />
                            <span className="font-display font-medium">ratemygig</span>
                            <span className="text-surface-600">•</span>
                            <span className="text-sm">Discover, attend, rate</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-surface-500">
                            <Link to="/about" className="hover:text-surface-300 transition-colors">About</Link>
                            <Link to="/privacy" className="hover:text-surface-300 transition-colors">Privacy</Link>
                            <Link to="/terms" className="hover:text-surface-300 transition-colors">Terms</Link>
                        </div>
                    </div>
                    <div className="mt-4 text-center text-xs text-surface-600">
                        © {new Date().getFullYear()} ratemygig. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
