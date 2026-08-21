import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { parseISO, isValid, isToday } from 'date-fns'
import { cn } from '@/shared/lib/utils'

/* ============================================================
   THE BOARD — structural primitives.
   Every list in the product is built from these. See DESIGN.md §3.
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

interface RailListProps {
    children: ReactNode
    className?: string
    /** Renders as a <ul>/<li> list. Default is a plain container. */
    as?: 'div' | 'ul'
    'aria-label'?: string
}

export function RailList({ children, className, as = 'div', ...rest }: RailListProps) {
    const Tag = as
    return (
        <Tag className={cn('rail-list', className)} {...rest}>
            {children}
        </Tag>
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

interface RowProps {
    /** Left slot: the row's identity — a date, a rank, a position. */
    slot?: ReactNode
    /** Right slot: a score or the single row action. */
    end?: ReactNode
    children: ReactNode
    /** Route for the whole row. Makes the row a link. */
    to?: string
    onClick?: () => void
    /** Marks the row as the live one — the rail-cap stays amber. */
    current?: boolean
    className?: string
}

/**
 * The row contract: slot · body · slot. Used by every list in the product so
 * the whole app reads as one board rather than a set of features.
 */
export function Row({ slot, end, children, to, onClick, current, className }: RowProps) {
    const interactive = Boolean(to || onClick)
    const classes = cn(
        'row',
        interactive && 'row-interactive',
        current && 'row-current',
        className
    )

    const inner = (
        <>
            {slot !== undefined && <span className="row-slot">{slot}</span>}
            <span className="row-body">{children}</span>
            {end !== undefined && <span className="row-end">{end}</span>}
        </>
    )

    if (to) {
        return (
            <Link to={to} className={classes}>
                {inner}
            </Link>
        )
    }

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={classes}>
                {inner}
            </button>
        )
    }

    return <div className={classes}>{inner}</div>
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
