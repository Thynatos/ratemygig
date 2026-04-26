import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeatureErrorBoundary } from './FeatureErrorBoundary'

// Component that throws
const ThrowError = ({ message }: { message: string }) => {
    throw new Error(message)
}

describe('FeatureErrorBoundary', () => {
    it('renders children when there is no error', () => {
        render(
            <FeatureErrorBoundary>
                <div data-testid="child">Hello</div>
            </FeatureErrorBoundary>
        )
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('renders fallback UI when child throws', () => {
        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        render(
            <FeatureErrorBoundary>
                <ThrowError message="Test error" />
            </FeatureErrorBoundary>
        )

        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText(/This section encountered an error/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()

        consoleSpy.mockRestore()
    })

    it('renders custom title when provided', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        render(
            <FeatureErrorBoundary title="Events failed to load">
                <ThrowError message="Test error" />
            </FeatureErrorBoundary>
        )

        expect(screen.getByText('Events failed to load')).toBeInTheDocument()

        consoleSpy.mockRestore()
    })

    it('retries and re-renders children when Try Again is clicked', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        let shouldThrow = true
        function MaybeThrow() {
            if (shouldThrow) throw new Error('Test error')
            return <div data-testid="recovered">Recovered</div>
        }

        render(
            <FeatureErrorBoundary>
                <MaybeThrow />
            </FeatureErrorBoundary>
        )

        expect(screen.getByText('Something went wrong')).toBeInTheDocument()

        // Simulate fixing the error and retrying
        shouldThrow = false
        fireEvent.click(screen.getByRole('button', { name: /Try Again/i }))

        expect(screen.getByTestId('recovered')).toBeInTheDocument()

        consoleSpy.mockRestore()
    })
})
