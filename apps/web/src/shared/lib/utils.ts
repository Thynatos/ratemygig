import { format, formatDistanceToNow, parseISO, isValid, isToday, isTomorrow, isPast } from 'date-fns'
import { z } from 'zod'
import { captureException } from './monitoring'

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
 * Human label for when a gig is. Used in board headers and row meta, where
 * "Tonight" carries more than a date does.
 */
export function whenLabel(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Date to be confirmed'
    if (isToday(d)) return 'Tonight'
    if (isTomorrow(d)) return 'Tomorrow'
    if (isPast(d)) {
        return d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    }
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
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
 * Colour for a rating value.
 *
 * Amber means "this was rated" (DESIGN.md §3) — it is not a temperature scale,
 * so a low score is quiet rather than red. Red is reserved for genuine failure
 * states, and a two-star gig is not a failure.
 */
export function getRatingColor(rating: number): string {
    return rating >= 3 ? 'text-strip' : 'text-bone-dim'
}

/**
 * Validate RPC response with a Zod schema.
 * Returns parsed data or throws a descriptive error.
 */
export function validateRpcResponse<T>(schema: z.ZodType<T>, data: unknown, context?: string): T {
    const result = schema.safeParse(data)
    if (!result.success) {
        const ctx = context ? ` (${context})` : ''
        console.error(`RPC response validation failed${ctx}:`, result.error.flatten())
        captureException(new Error(`RPC response validation failed${ctx}`), {
            context,
            issues: result.error.flatten(),
        })
        throw new Error(`Invalid response from server${ctx}`)
    }
    return result.data
}

/**
 * Trigger a browser download for text content (CSV, iCal, etc.)
 */
export function downloadTextFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
}

interface CsvRow {
    [key: string]: string | number | boolean | null | undefined
}

/**
 * Export data array as CSV and trigger browser download
 */
export function exportToCsv(rows: CsvRow[], filename: string): void {
    if (rows.length === 0) return

    const headers = Object.keys(rows[0])
    const escape = (val: unknown): string => {
        const str = String(val ?? '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }

    const csv = [
        headers.join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\n')

    downloadTextFile(csv, filename, 'text/csv;charset=utf-8;')
}
