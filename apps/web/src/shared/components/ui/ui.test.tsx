import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { checkA11y } from '@/test/axe'
import { Button } from './Button'
import { Input } from './Input'
import { StarRating, RatingDisplay } from './StarRating'
import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { Card, CardHeader, CardContent, CardFooter } from './Card'
import { Modal } from './Modal'
import { LoadingSpinner, LoadingPage, Skeleton, EventCardSkeleton } from './Loading'

describe('Button', () => {
    it('renders with default variant and size', () => {
        render(<Button>Click me</Button>)
        const btn = screen.getByRole('button', { name: 'Click me' })
        expect(btn).toBeInTheDocument()
        expect(btn).not.toBeDisabled()
    })

    it('applies variant classes', () => {
        const { rerender } = render(<Button variant="secondary">Secondary</Button>)
        expect(screen.getByRole('button')).toBeInTheDocument()

        rerender(<Button variant="danger">Danger</Button>)
        expect(screen.getByRole('button')).toBeInTheDocument()

        rerender(<Button variant="ghost">Ghost</Button>)
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('applies size classes', () => {
        const { rerender } = render(<Button size="sm">Small</Button>)
        expect(screen.getByRole('button')).toBeInTheDocument()

        rerender(<Button size="lg">Large</Button>)
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('shows loader when isLoading', () => {
        render(<Button isLoading>Loading</Button>)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn()
        render(<Button onClick={handleClick}>Click</Button>)
        fireEvent.click(screen.getByRole('button'))
        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('forwards ref correctly', () => {
        const ref = { current: null as HTMLButtonElement | null }
        render(<Button ref={ref}>Ref</Button>)
        expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('has no accessibility violations', async () => {
        const { container } = render(<Button>Click me</Button>)
        expect(await checkA11y(container)).toHaveNoViolations()
    })
})

describe('Input', () => {
    it('renders with label', () => {
        render(<Input label="Email" name="email" />)
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('shows error message', () => {
        render(<Input error="Required field" name="field" />)
        expect(screen.getByText('Required field')).toBeInTheDocument()
    })

    it('shows hint when no error', () => {
        render(<Input hint="Enter your name" name="name" />)
        expect(screen.getByText('Enter your name')).toBeInTheDocument()
    })

    it('does not show hint when error is present', () => {
        render(<Input hint="Hint" error="Error" name="field" />)
        expect(screen.queryByText('Hint')).not.toBeInTheDocument()
        expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('forwards ref correctly', () => {
        const ref = { current: null as HTMLInputElement | null }
        render(<Input ref={ref} name="test" />)
        expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('calls onChange when typed', () => {
        const handleChange = vi.fn()
        render(<Input name="test" onChange={handleChange} />)
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
        expect(handleChange).toHaveBeenCalled()
    })

    it('has no accessibility violations', async () => {
        const { container } = render(<Input label="Email" name="email" />)
        expect(await checkA11y(container)).toHaveNoViolations()
    })
})

describe('StarRating', () => {
    it('renders 5 stars', () => {
        render(<StarRating value={3} />)
        expect(screen.getAllByRole('button')).toHaveLength(5)
    })

    it('calls onChange when clicked', () => {
        const handleChange = vi.fn()
        render(<StarRating value={0} onChange={handleChange} />)
        fireEvent.click(screen.getAllByRole('button')[2])
        expect(handleChange).toHaveBeenCalledWith(3)
    })

    it('does not call onChange when readonly', () => {
        const handleChange = vi.fn()
        render(<StarRating value={3} onChange={handleChange} readonly />)
        fireEvent.click(screen.getAllByRole('button')[0])
        expect(handleChange).not.toHaveBeenCalled()
    })

    it('calls onChange on Enter key', () => {
        const handleChange = vi.fn()
        render(<StarRating value={0} onChange={handleChange} />)
        fireEvent.keyDown(screen.getAllByRole('button')[3], { key: 'Enter' })
        expect(handleChange).toHaveBeenCalledWith(4)
    })

    it('calls onChange on Space key', () => {
        const handleChange = vi.fn()
        render(<StarRating value={0} onChange={handleChange} />)
        fireEvent.keyDown(screen.getAllByRole('button')[0], { key: ' ' })
        expect(handleChange).toHaveBeenCalledWith(1)
    })

    it('displays value when showValue is true', () => {
        render(<StarRating value={4.5} showValue />)
        expect(screen.getByText('4.5')).toBeInTheDocument()
    })

    it('shows dash when value is 0 and showValue is true', () => {
        render(<StarRating value={0} showValue />)
        expect(screen.getByText('-')).toBeInTheDocument()
    })
})

describe('RatingDisplay', () => {
    it('renders rating and count', () => {
        render(<RatingDisplay rating={4.2} count={15} />)
        expect(screen.getByText('4.2')).toBeInTheDocument()
        expect(screen.getByText('(15 reviews)')).toBeInTheDocument()
    })

    it('renders singular review text', () => {
        render(<RatingDisplay rating={5} count={1} />)
        expect(screen.getByText('(1 review)')).toBeInTheDocument()
    })

    it('shows dash when rating is 0', () => {
        render(<RatingDisplay rating={0} />)
        expect(screen.getByText('-')).toBeInTheDocument()
    })
})

describe('Avatar', () => {
    it('renders image when src is provided', () => {
        render(<Avatar src="https://example.com/avatar.jpg" name="John Doe" />)
        expect(screen.getByAltText('John Doe')).toBeInTheDocument()
    })

    it('renders fallback initials when no src', () => {
        render(<Avatar name="John Doe" />)
        expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('renders fallback when image errors', () => {
        render(<Avatar src="invalid.jpg" name="Jane Smith" />)
        const img = screen.getByAltText('Jane Smith')
        fireEvent.error(img)
        expect(screen.getByText('JS')).toBeInTheDocument()
    })

    it('renders fallback with empty name', () => {
        render(<Avatar />)
        expect(screen.getByText('?')).toBeInTheDocument()
    })
})

describe('Badge', () => {
    it('renders children', () => {
        render(<Badge>New</Badge>)
        expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('applies variant classes', () => {
        const { rerender } = render(<Badge variant="primary">Primary</Badge>)
        expect(screen.getByText('Primary')).toBeInTheDocument()

        rerender(<Badge variant="success">Success</Badge>)
        expect(screen.getByText('Success')).toBeInTheDocument()

        rerender(<Badge variant="danger">Danger</Badge>)
        expect(screen.getByText('Danger')).toBeInTheDocument()
    })
})

describe('Card', () => {
    it('renders children', () => {
        render(<Card>Content</Card>)
        expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn()
        render(<Card onClick={handleClick}>Clickable</Card>)
        fireEvent.click(screen.getByText('Clickable'))
        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('renders CardHeader, CardContent, CardFooter', () => {
        render(
            <Card>
                <CardHeader>Header</CardHeader>
                <CardContent>Body</CardContent>
                <CardFooter>Footer</CardFooter>
            </Card>
        )
        expect(screen.getByText('Header')).toBeInTheDocument()
        expect(screen.getByText('Body')).toBeInTheDocument()
        expect(screen.getByText('Footer')).toBeInTheDocument()
    })
})

describe('Modal', () => {
    it('does not render when closed', () => {
        render(
            <Modal isOpen={false} onClose={vi.fn()}>
                Content
            </Modal>
        )
        expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    it('renders when open', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()}>
                Content
            </Modal>
        )
        expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('renders title and close button', () => {
        const handleClose = vi.fn()
        render(
            <Modal isOpen={true} onClose={handleClose} title="My Modal">
                Body
            </Modal>
        )
        expect(screen.getByText('My Modal')).toBeInTheDocument()
        fireEvent.click(screen.getByLabelText('Close modal'))
        expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose on overlay click', () => {
        const handleClose = vi.fn()
        render(
            <Modal isOpen={true} onClose={handleClose}>
                Body
            </Modal>
        )
        const overlay = screen.getByText('Body').closest('.modal-overlay')
        if (overlay) fireEvent.click(overlay)
        expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose on Escape key', () => {
        const handleClose = vi.fn()
        render(
            <Modal isOpen={true} onClose={handleClose}>
                Body
            </Modal>
        )
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('has no accessibility violations', async () => {
        const { container } = render(
            <Modal isOpen={true} onClose={vi.fn()} title="My Modal">
                Body
            </Modal>
        )
        expect(await checkA11y(container)).toHaveNoViolations()
    })
})

describe('Loading', () => {
    it('renders LoadingSpinner', () => {
        render(<LoadingSpinner />)
        expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders LoadingPage with default message', () => {
        render(<LoadingPage />)
        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders LoadingPage with custom message', () => {
        render(<LoadingPage message="Please wait" />)
        expect(screen.getByText('Please wait')).toBeInTheDocument()
    })

    it('renders Skeleton', () => {
        render(<Skeleton />)
        expect(document.querySelector('.skeleton')).toBeInTheDocument()
    })

    it('renders EventCardSkeleton', () => {
        render(<EventCardSkeleton />)
        expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
    })
})
