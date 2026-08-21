import { Link, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { Avatar } from '@/shared/components/ui/Avatar'
import { cn } from '@/shared/lib/utils'

const PUBLIC_NAV = [
    { to: '/', label: 'Discover' },
    { to: '/artists', label: 'Artists' },
    { to: '/venues', label: 'Venues' },
]

const MEMBER_NAV = [
    { to: '/feed', label: 'Feed' },
    { to: '/my-gigs', label: 'My gigs' },
]

/** The wordmark: bone capitals with an amber strip slid in beneath them. */
function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex flex-col items-start gap-1', className)}>
            <span className="voice-board text-bone leading-none text-[1.0625rem] sm:text-[1.1875rem]">
                ratemygig
            </span>
            <span className="block h-[3px] w-full bg-strip" aria-hidden="true" />
        </span>
    )
}

export function Layout() {
    const { user, signOut, isLoading } = useAuth()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const menuButtonRef = useRef<HTMLButtonElement>(null)

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/'
        return location.pathname.startsWith(path)
    }

    // Close the menu on navigation and on Escape; return focus to its trigger.
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [location.pathname])

    useEffect(() => {
        if (!mobileMenuOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMobileMenuOpen(false)
                menuButtonRef.current?.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [mobileMenuOpen])

    const navItems = user ? [...PUBLIC_NAV, ...MEMBER_NAV] : PUBLIC_NAV

    return (
        <div className="min-h-screen flex flex-col bg-groove">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-strip focus:text-strip-ink focus:px-3 focus:py-2 focus:voice-label"
            >
                Skip to content
            </a>

            <header className="sticky top-0 z-40 bg-board border-b border-rail-strong">
                <div className="page">
                    <div className="flex items-center justify-between gap-4 h-16">
                        <div className="flex items-center gap-6 lg:gap-8 min-w-0">
                            <Link
                                to="/"
                                className="shrink-0 py-2"
                                aria-label="ratemygig — home"
                            >
                                <Wordmark />
                            </Link>

                            <nav
                                className="hidden md:flex items-center h-16"
                                aria-label="Main"
                            >
                                {navItems.map(({ to, label }) => (
                                    <Link
                                        key={to}
                                        to={to}
                                        className={cn(
                                            'nav-link h-16 inline-flex items-center',
                                            isActive(to) && 'nav-link-active'
                                        )}
                                        aria-current={isActive(to) ? 'page' : undefined}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            {isLoading ? (
                                <div
                                    className="skeleton w-8 h-8"
                                    aria-label="Checking your session"
                                    role="status"
                                />
                            ) : user ? (
                                <>
                                    <NotificationBell />
                                    <Link
                                        to="/profile"
                                        className={cn(
                                            'inline-flex items-center gap-2 px-1.5 py-1 transition-colors duration-150 ease-board hover:bg-board-raised',
                                            isActive('/profile') && 'bg-board-raised'
                                        )}
                                        aria-current={isActive('/profile') ? 'page' : undefined}
                                    >
                                        <Avatar
                                            src={
                                                (user.user_metadata?.avatar_url as string) ??
                                                undefined
                                            }
                                            name={
                                                (user.user_metadata?.full_name as string) ??
                                                user.email ??
                                                null
                                            }
                                            size="sm"
                                        />
                                        <span className="sr-only">Your profile</span>
                                    </Link>
                                    <button
                                        onClick={() => signOut()}
                                        className="btn-icon hidden sm:inline-flex"
                                        title="Sign out"
                                        aria-label="Sign out"
                                    >
                                        <LogOut className="w-[18px] h-[18px]" aria-hidden="true" />
                                    </button>
                                </>
                            ) : (
                                <Link to="/login" className="btn-primary">
                                    Sign in
                                </Link>
                            )}

                            <button
                                ref={menuButtonRef}
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden btn-icon"
                                aria-expanded={mobileMenuOpen}
                                aria-controls="mobile-menu"
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            >
                                {mobileMenuOpen ? (
                                    <X className="w-5 h-5" aria-hidden="true" />
                                ) : (
                                    <Menu className="w-5 h-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div
                        id="mobile-menu"
                        className="md:hidden border-t border-rail bg-board"
                    >
                        <nav aria-label="Mobile" className="rail-list border-y-0">
                            {navItems.map(({ to, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={cn(
                                        'row row-interactive voice-slot text-ui',
                                        isActive(to) ? 'text-strip row-current' : 'text-bone'
                                    )}
                                    aria-current={isActive(to) ? 'page' : undefined}
                                >
                                    <span className="row-body">{label}</span>
                                </Link>
                            ))}
                            {user && (
                                <>
                                    <Link
                                        to="/notifications"
                                        className={cn(
                                            'row row-interactive voice-slot text-ui',
                                            isActive('/notifications')
                                                ? 'text-strip row-current'
                                                : 'text-bone'
                                        )}
                                        aria-current={
                                            isActive('/notifications') ? 'page' : undefined
                                        }
                                    >
                                        <span className="row-body">Notifications</span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => signOut()}
                                        className="row row-interactive voice-slot text-ui text-bone-dim"
                                    >
                                        <span className="row-body">Sign out</span>
                                    </button>
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </header>

            <main id="main-content" className="flex-1" tabIndex={-1}>
                <Outlet />
            </main>

            <footer className="mt-16 border-t border-rail-strong bg-board">
                <div className="page py-10">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <Wordmark className="mb-3" />
                            <p className="text-ui-sm text-bone-dim max-w-[26ch]">
                                Every gig you've been to, kept. Log the night, rate the room.
                            </p>
                        </div>

                        <nav aria-label="Browse">
                            <h2 className="voice-label text-bone-faint mb-3">Browse</h2>
                            <ul className="space-y-2 text-ui-sm">
                                <li><Link to="/" className="text-bone-dim hover:text-bone">Upcoming gigs</Link></li>
                                <li><Link to="/artists" className="text-bone-dim hover:text-bone">Artists</Link></li>
                                <li><Link to="/venues" className="text-bone-dim hover:text-bone">Venues</Link></li>
                            </ul>
                        </nav>

                        <nav aria-label="Charts">
                            <h2 className="voice-label text-bone-faint mb-3">Charts</h2>
                            <ul className="space-y-2 text-ui-sm">
                                <li><Link to="/artists/top" className="text-bone-dim hover:text-bone">Top rated artists</Link></li>
                                <li><Link to="/venues/top" className="text-bone-dim hover:text-bone">Top rated venues</Link></li>
                                {user && (
                                    <li><Link to="/wrapped" className="text-bone-dim hover:text-bone">Your year in gigs</Link></li>
                                )}
                            </ul>
                        </nav>

                        <nav aria-label="About">
                            <h2 className="voice-label text-bone-faint mb-3">About</h2>
                            <ul className="space-y-2 text-ui-sm">
                                <li><Link to="/about" className="text-bone-dim hover:text-bone">What this is</Link></li>
                                <li><Link to="/privacy" className="text-bone-dim hover:text-bone">Privacy</Link></li>
                                <li><Link to="/terms" className="text-bone-dim hover:text-bone">Terms</Link></li>
                            </ul>
                        </nav>
                    </div>

                    <p className="mt-10 pt-5 border-t border-rail voice-label text-bone-faint">
                        © {new Date().getFullYear()} ratemygig · Tickets are sold by other people
                    </p>
                </div>
            </footer>
        </div>
    )
}
