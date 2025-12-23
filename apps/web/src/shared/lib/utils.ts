import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy'): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid date'
    return format(d, formatStr)
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid date'
    return format(d, 'MMM d, yyyy • h:mm a')
}

/**
 * Get relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Unknown'
    return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Combine class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ')
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string | null | undefined): string {
    if (!name) return '?'
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + '...'
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num)
}

/**
 * Calculate average rating
 */
export function calculateAverageRating(ratings: number[]): number {
    if (ratings.length === 0) return 0
    const sum = ratings.reduce((acc, val) => acc + val, 0)
    return Math.round((sum / ratings.length) * 10) / 10
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Sanitize user-generated HTML content
 */
export function sanitizeHtml(html: string): string {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
}

/**
 * Generate a random UUID
 */
export function generateId(): string {
    return crypto.randomUUID()
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

/**
 * Get city display name
 */
export function getCityDisplayName(city: string, country?: string): string {
    if (country) {
        return `${city}, ${country}`
    }
    return city
}

/**
 * Get rating color based on value
 */
export function getRatingColor(rating: number): string {
    if (rating >= 4.5) return 'text-green-400'
    if (rating >= 3.5) return 'text-lime-400'
    if (rating >= 2.5) return 'text-yellow-400'
    if (rating >= 1.5) return 'text-orange-400'
    return 'text-red-400'
}
