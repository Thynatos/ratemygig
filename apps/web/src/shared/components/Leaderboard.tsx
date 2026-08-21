import { Link } from 'react-router-dom'
import type { RatingDistribution } from '@core/index'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { cn } from '@/shared/lib/utils'

/* ============================================================
   Charts drawn as bare columns. Numbers are the material
   (DESIGN.md §2, raise from datamatics) — no rings, no
   sparklines, no soft-shadowed rounded rectangles.
   ============================================================ */

interface DistributionProps {
    distribution: Partial<RatingDistribution>
    /** Compact renders a 24px strip for a row; full renders a labelled chart. */
    variant?: 'compact' | 'full'
    className?: string
}

const BUCKETS = [1, 2, 3, 4, 5] as const

export function Distribution({
    distribution,
    variant = 'compact',
    className,
}: DistributionProps) {
    const counts = BUCKETS.map(
        n => Number(distribution[`rating_${n}` as keyof RatingDistribution] ?? 0)
    )
    const total = counts.reduce((a, b) => a + b, 0)
    const max = Math.max(...counts, 1)

    if (total === 0) return null

    if (variant === 'compact') {
        return (
            <span
                className={cn('flex items-end gap-[2px] h-5', className)}
                aria-hidden="true"
            >
                {counts.map((count, i) => (
                    <span
                        key={i}
                        className={cn('w-[3px] block', count > 0 ? 'bg-strip' : 'bg-rail')}
                        style={{ height: `${Math.max(12, (count / max) * 100)}%` }}
                    />
                ))}
            </span>
        )
    }

    return (
        <div className={cn('space-y-1.5', className)}>
            {[...BUCKETS].reverse().map(n => {
                const count = counts[n - 1]
                const pct = total > 0 ? (count / total) * 100 : 0
                return (
                    <div key={n} className="flex items-center gap-2.5">
                        <span className="voice-data text-ui-sm text-bone-faint w-3 tabular-nums">
                            {n}
                        </span>
                        <span className="flex-1 h-3 bg-groove border border-rail">
                            <span
                                className="block h-full bg-strip"
                                style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                            />
                        </span>
                        <span className="voice-data text-ui-sm text-bone-dim w-8 text-right tabular-nums">
                            {count}
                        </span>
                    </div>
                )
            })}
            <p className="voice-label text-bone-faint pt-1">
                {total} {total === 1 ? 'rating' : 'ratings'}
            </p>
        </div>
    )
}

/* ---------------------------------------------------------------- */

export interface LeaderboardEntry {
    id: string
    name: string
    meta?: string
    avgRating: number
    countReviews: number
    distribution?: Partial<RatingDistribution>
}

interface LeaderboardProps {
    entries: LeaderboardEntry[]
    /** Route prefix, e.g. "/venues". */
    hrefPrefix: string
}

/**
 * A league table on the board: rank in the left slot, name and place in the
 * body, the score as a figure plus its strip in the right slot.
 */
export function Leaderboard({ entries, hrefPrefix }: LeaderboardProps) {
    return (
        <ol className="rail-list">
            {entries.map((entry, index) => (
                <li key={entry.id}>
                    <Link to={`${hrefPrefix}/${entry.id}`} className="row row-interactive">
                        <span className="row-slot">
                            <span
                                className={cn(
                                    'voice-board tnum leading-none text-[1.75rem]',
                                    index === 0 ? 'text-strip' : 'text-bone-dim'
                                )}
                                aria-hidden="true"
                            >
                                {index + 1}
                            </span>
                        </span>

                        <span className="row-body">
                            <span className="row-title">{entry.name}</span>
                            {entry.meta && <span className="row-meta">{entry.meta}</span>}
                        </span>

                        <span className="row-end flex-row items-center gap-3">
                            {entry.distribution && (
                                <Distribution distribution={entry.distribution} />
                            )}
                            <span className="flex flex-col items-end gap-1">
                                <span className="flex items-center gap-2">
                                    <span className="voice-board tnum text-board-md text-strip leading-none">
                                        {entry.avgRating.toFixed(1)}
                                    </span>
                                    <ScoreStrip value={entry.avgRating} size="sm" />
                                </span>
                                <span className="voice-label text-bone-faint tnum">
                                    {entry.countReviews}{' '}
                                    {entry.countReviews === 1 ? 'review' : 'reviews'}
                                </span>
                            </span>
                            <span className="sr-only">
                                Ranked {index + 1}. {entry.avgRating.toFixed(1)} out of 5 from{' '}
                                {entry.countReviews} reviews.
                            </span>
                        </span>
                    </Link>
                </li>
            ))}
        </ol>
    )
}

/* ---------------------------------------------------------------- */

interface LeaderboardFiltersProps {
    year: number | ''
    onYearChange: (year: number | '') => void
    city: string
    onCityChange: (city: string) => void
    yearChoices: number[]
    cityLabel?: string
}

export function LeaderboardFilters({
    year,
    onYearChange,
    city,
    onCityChange,
    yearChoices,
    cityLabel = 'City',
}: LeaderboardFiltersProps) {
    return (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,18rem)]">
            <div>
                <label htmlFor="leaderboard-year" className="input-label">
                    Year
                </label>
                <select
                    id="leaderboard-year"
                    value={year === '' ? '' : String(year)}
                    onChange={e => {
                        const v = e.target.value
                        onYearChange(v === '' ? '' : Number(v))
                    }}
                    className="input-field"
                >
                    <option value="">Every year</option>
                    {yearChoices.map(y => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="leaderboard-city" className="input-label">
                    {cityLabel}
                </label>
                <input
                    id="leaderboard-city"
                    type="search"
                    value={city}
                    onChange={e => onCityChange(e.target.value)}
                    placeholder="Anywhere"
                    className="input-field"
                />
            </div>
        </div>
    )
}
