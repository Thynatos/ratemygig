import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { checkA11y } from '@/test/axe'
import { useToast } from '@/shared/hooks/useToast'
import { ToastProvider } from './Toast'

function Trigger({ id, message }: { id?: string; message: string }) {
    const toast = useToast()
    return (
        <>
            <button type="button" onClick={() => toast.error({ id, title: 'Couldn’t import', message })}>
                Raise {message}
            </button>
            {id && (
                <button type="button" onClick={() => toast.dismiss(id)}>
                    Clear {id}
                </button>
            )}
        </>
    )
}

describe('ToastProvider', () => {
    it('shows an error toast as an alert with its title and message', () => {
        render(
            <ToastProvider>
                <Trigger message="setlist.fm has no setlist at that link." />
            </ToastProvider>
        )

        fireEvent.click(screen.getByRole('button', { name: /Raise/ }))

        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent('Couldn’t import')
        expect(alert).toHaveTextContent('setlist.fm has no setlist at that link.')
    })

    it('replaces a toast raised again under the same id instead of stacking', () => {
        render(
            <ToastProvider>
                <Trigger id="import" message="First" />
                <Trigger id="import" message="Second" />
            </ToastProvider>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Raise First' }))
        fireEvent.click(screen.getByRole('button', { name: 'Raise Second' }))

        expect(screen.getAllByRole('alert')).toHaveLength(1)
        expect(screen.getByRole('alert')).toHaveTextContent('Second')
    })

    it('can be dismissed by the reader or by id', () => {
        render(
            <ToastProvider>
                <Trigger id="import" message="Gone soon" />
            </ToastProvider>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Raise Gone soon' }))
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss this message' }))
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Raise Gone soon' }))
        fireEvent.click(screen.getByRole('button', { name: 'Clear import' }))
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('keeps at most three on screen, dropping the oldest', () => {
        render(
            <ToastProvider>
                {['One', 'Two', 'Three', 'Four'].map(message => (
                    <Trigger key={message} message={message} />
                ))}
            </ToastProvider>
        )

        for (const message of ['One', 'Two', 'Three', 'Four']) {
            fireEvent.click(screen.getByRole('button', { name: `Raise ${message}` }))
        }

        const alerts = screen.getAllByRole('alert')
        expect(alerts).toHaveLength(3)
        expect(alerts[0]).toHaveTextContent('Two')
        expect(alerts[2]).toHaveTextContent('Four')
    })

    it('has no axe violations with a toast showing', async () => {
        const { container } = render(
            <ToastProvider>
                <Trigger message="Couldn't reach setlist.fm." />
            </ToastProvider>
        )
        fireEvent.click(screen.getByRole('button', { name: /Raise/ }))
        expect(await checkA11y(container)).toHaveNoViolations()
    })
})

describe('useToast', () => {
    it('throws outside a ToastProvider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        expect(() => render(<Trigger message="x" />)).toThrow('useToast must be used inside a ToastProvider')
        spy.mockRestore()
    })
})
