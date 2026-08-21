import { ReactNode } from 'react'
import { parseISO, isValid, isToday } from 'date-fns'
import { cn } from '@/shared/lib/utils'

/* ============================================================
   THE BOARD — structural primitives.

   The row contract itself (`.row`, `.row-slot`, `.row-body`, `.row-end`,
   `.rail-list`) lives in index.css rather than in a component: every list in
   the product composes it directly from those classes, so wrapping them in a
   React shim would add an indirection with no callers. What lives here is the
   furniture that carries real logic — the header, the date slot, the states,
   and the figures. See DESIGN.md §3.
   ============================================================ */

interface BoardHeaderProps {
    /** The page title, set in the board voice. */
    title: ReactNode
    /** One sentence of orientation. Sentence case, never caps. */
    lede?: ReactNode
    /**
     * The live fact — today's date, the current year, the next show in the
     * room. Rendered as the one amber strip above the fold, and only one.
     */
    strip?: ReactNode
    /** Primary action for the page, sitting in the header's right slot. */
    action?: ReactNode
    /** Sits under the rail: filters, tabs, breadcrumbs. */
    children?: ReactNode
    className?: string
}

export function BoardHeader({
    title,
    lede,
    strip,
    action,
    children,
    className,
}: BoardHeaderProps) {
    return (
        <div className={cn('board-header', className)}>
            {strip && (
                <div className="overflow-hidden mb-4">
                    <p className="strip strip-enter">{strip}</p>
                </div>
            )}
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div className="min-w-0">
                    <h1 className="board-title">{title}</h1>
                    {lede && <p className="board-lede">{lede}</p>}
                </div>
                {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
            </div>
            {children && <div className="mt-5">{children}</div>}
        </div>
    )
}

/* ---------------------------------------------------------------- */

interface DateSlotProps {
    date: string | Date
    className?: string
}

/** The identity of an event row: day of week, day, month, stacked in the slot. */
export function DateSlot({ date, className }: DateSlotProps) {
    const d = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(d)) {
        return (
            <span className={cn('date-slot', className)}>
                <span className="date-slot-dow">Date</span>
                <span className="date-slot-day">—</span>
                <span className="date-slot-mon">TBC</span>
            </span>
        )
    }

    const tonight = isToday(d)

    return (
        <span className={cn('date-slot', tonight && 'date-slot-tonight', className)}>
            <span className="date-slot-dow">
                {tonight ? 'Tonight' : d.toLocaleDateString('en-GB', { weekday: 'short' })}
            </span>
            <span className="date-slot-day">{d.getDate()}</span>
            <span className="date-slot-mon">
                {/* Sliced to three so every month occupies the same slot width. */}
                {d.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3)}
                {d.getFullYear() !== new Date().getFullYear() && (
                    <span className="text-bone-faint"> {String(d.getFullYear()).slice(2)}</span>
                )}
            </span>
        </span>
    )
}

/* ---------------------------------------------------------------- */

interface EmptyStateProps {
    /** What is not here. Sentence case, plain. */
    title: string
    /** How to change that. One sentence. */
    body?: ReactNode
    /** The way out. */
    action?: ReactNode
    className?: string
}

/**
 * An empty board is an invitation, not an apology. Rendered as the board's own
 * furniture — a rail, a line of bone type, a way out — never an illustration.
 */
export function EmptyState({ title, body, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'border border-rail bg-board px-6 py-12 sm:py-16 text-center',
                className
            )}
        >
            <div className="mx-auto max-w-sm flex flex-col items-center gap-4">
                <span className="score" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <span key={i} className="score-slot w-[14px] h-[22px]" />
                    ))}
                </span>
                <h2 className="voice-slot text-board-md text-bone">{title}</h2>
                {body && <p className="text-ui text-bone-dim">{body}</p>}
                {action && <div className="mt-1">{action}</div>}
            </div>
        </div>
    )
}

/* ---------------------------------------------------------------- */

interface ErrorStateProps {
    /** Names the problem, not the exception. */
    title?: string
    body?: ReactNode
    onRetry?: () => void
    retryLabel?: string
    className?: string
}

/** Errors name what happened and how to fix it. They do not apologise. */
export function ErrorState({
    title = "Couldn't load this",
    body = 'The board is up but the data did not arrive. Try again.',
    onRetry,
    retryLabel = 'Try again',
    className,
}: ErrorStateProps) {
    return (
        <div
            role="alert"
            className={cn('border border-struck bg-board px-6 py-10 text-center', className)}
        >
            <div className="mx-auto max-w-sm flex flex-col items-center gap-3">
                <span className="voice-label text-struck">Error</span>
                <h2 className="voice-slot text-board-md text-bone">{title}</h2>
                <p className="text-ui text-bone-dim">{body}</p>
                {onRetry && (
                    <button type="button" onClick={onRetry} className="btn-secondary mt-2">
                        {retryLabel}
                    </button>
                )}
            </div>
        </div>
    )
}

/* ---------------------------------------------------------------- */

interface FigureProps {
    value: ReactNode
    label: string
    /** Secondary line under the label. */
    note?: ReactNode
    accent?: boolean
    className?: string
}

/**
 * Numbers are the material (DESIGN.md §2, raise from datamatics). Tabular
 * lining figures at display scale, label beneath in a micro-caps slot.
 */
export function Figure({ value, label, note, accent, className }: FigureProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <span
                className={cn(
                    'voice-board tnum text-board-lg leading-none',
                    accent ? 'text-strip' : 'text-bone'
                )}
            >
                {value}
            </span>
            <span className="voice-label text-bone-dim">{label}</span>
            {note && <span className="text-ui-sm text-bone-faint">{note}</span>}
        </div>
    )
}

/* ---------------------------------------------------------------- */

interface FigureRailProps {
    children: ReactNode
    className?: string
}

/** A row of figures separated by rails — the stats band under a board header. */
export function FigureRail({ children, className }: FigureRailProps) {
    return (
        <div
            className={cn(
                'grid grid-cols-2 sm:grid-cols-4 border border-rail bg-board',
                '[&>*]:px-4 [&>*]:py-4',
                '[&>*:not(:first-child)]:border-l [&>*]:border-rail',
                'max-sm:[&>*:nth-child(odd)]:border-l-0 max-sm:[&>*:nth-child(n+3)]:border-t',
                className
            )}
        >
            {children}
        </div>
    )
}
