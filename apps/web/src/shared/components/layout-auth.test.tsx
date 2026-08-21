import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { checkA11y } from '@/test/axe'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuthContext } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { Layout } from '@/shared/components/Layout'

// Mock Supabase
vi.mock('@/shared/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn().mockReturnValue({
                data: { subscription: { unsubscribe: vi.fn() } },
            }),
            signOut: vi.fn().mockResolvedValue({}),
        },
    },
}))

function TestConsumer() {
    try {
        const auth = useAuthContext()
        return (
            <div>
                <span data-testid="auth-user">{auth.user ? auth.user.id : 'null'}</span>
                <span data-testid="auth-loading">{auth.isLoading ? 'true' : 'false'}</span>
            </div>
        )
    } catch {
        return <div>no context</div>
    }
}

describe('AuthProvider', () => {
    it('provides unauthenticated state by default', async () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <TestConsumer />
                </AuthProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('auth-loading')).toHaveTextContent('false')
        })

        expect(screen.getByTestId('auth-user')).toHaveTextContent('null')
    })
})

describe('ProtectedRoute', () => {
    it('redirects to login when not authenticated', async () => {
        render(
            <MemoryRouter initialEntries={['/protected']}>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<div>Login Page</div>} />
                        <Route element={<ProtectedRoute />}>
                            <Route path="/protected" element={<div>Protected</div>} />
                        </Route>
                    </Routes>
                </AuthProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('Login Page')).toBeInTheDocument()
        })
    })
})

describe('Layout', () => {
    it('renders navigation links', async () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByRole('link', { name: /^Discover$/i })).toBeInTheDocument()
        })

        // The chart pages moved out of the main nav into a tab on each index
        // page, so Venues/Artists appear both in the nav and in the footer.
        expect(screen.getAllByRole('link', { name: /^Venues$/i }).length).toBeGreaterThan(0)
        expect(screen.getAllByRole('link', { name: /^Artists$/i }).length).toBeGreaterThan(0)
        expect(
            screen.getByRole('link', { name: /^Top rated venues$/i })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: /^Top rated artists$/i })
        ).toBeInTheDocument()
    })

    it('shows sign in button when not authenticated', async () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
        })
    })

    it('renders footer links', async () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByRole('link', { name: /^What this is$/i })).toBeInTheDocument()
        })

        expect(screen.getByRole('link', { name: /^Privacy$/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /^Terms$/i })).toBeInTheDocument()
    })

    it('has no accessibility violations', async () => {
        const { container } = render(
            <MemoryRouter>
                <AuthProvider>
                    <Layout />
                </AuthProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByRole('link', { name: /^Discover$/i })).toBeInTheDocument()
        })

        expect(await checkA11y(container)).toHaveNoViolations()
    })
})
