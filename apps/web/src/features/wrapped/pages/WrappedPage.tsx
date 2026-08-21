import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
    useYearStats,
    resolveWrappedYear,
    MIN_WRAPPED_YEAR,
} from '@/features/wrapped/api/yearStats'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { EmptyState, Figure } from '@/shared/components/ui/Board'
import { formatDate, formatNumber } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { YearStatEntry } from '@core/index'

/**
 * A league table of the year: rank in the left slot, the name in the body, and
 * the count both as a figure and as a bar sized against the leader.
 */
function TopList({ title, entries }: { title: string; entries: YearStatEntry[] }) {
    if (entries.length === 0) return null
    const max = Math.max(...entries.map(e => e.count), 1)

    return (
        <section>
            <h2 className="voice-label text-bone-dim mb-3">{title}</h2>
            <ol className="rail-list">
                {entries.map((entry, index) => (
                    <li key={entry.name + index} className="row items-center">
                        <span className="row-slot !w-10 sm:!w-12">
                            <span
                                className={
                                    index === 0
                                        ? 'voice-board tnum text-strip text-[1.75rem] leading-none'
                                        : 'voice-board tnum text-bone-dim text-[1.75rem] leading-none'
                                }
                                aria-hidden="true"
                            >
                                {index + 1}
                            </span>
                        </span>

                        <span className="row-body">
                            <span className="row-title">{sanitizeText(entry.name)}</span>
                            <span
                                aria-hidden="true"
                                className="block h-1.5 bg-groove mt-1.5 max-w-[16rem]"
                            >
                                <span
                                    className="block h-full bg-strip"
                                    style={{ width: `${Math.max((entry.count / max) * 100, 6)}%` }}
                                />
                            </span>
                        </span>

                        <span className="row-end">
                            <span className="voice-label text-bone-dim tnum">
                                {formatNumber(entry.count)} gigs
                            </span>
                        </span>
                    </li>
                ))}
            </ol>
        </section>
    )
}

export function WrappedPage() {
    const { user } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const year = resolveWrappedYear(searchParams.get('year'))
    const currentYear = new Date().getFullYear()

    const { data: stats, isLoading } = useYearStats(user?.id, year)

    const goToYear = (target: number) => {
        setSearchParams({ year: String(target) })
    }

    if (isLoading) return <LoadingPage message={`Counting up your ${year}`} />

    const isEmpty = !stats || stats.gigs_attended === 0

    return (
        <div className="page page-body max-w-3xl">
            <header className="board-header">
                {/* The year is the fact this page exists to state, so it is the
                    strip and the headline at once. */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => goToYear(year - 1)}
                        disabled={year <= MIN_WRAPPED_YEAR}
                        aria-label="Previous year"
                        className="btn-secondary"
                    >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                        <span className="tnum">{year - 1}</span>
                    </button>

                    <p className="voice-label text-bone-faint">Your year in gigs</p>

                    <button
                        type="button"
                        onClick={() => goToYear(year + 1)}
                        disabled={year >= currentYear}
                        aria-label="Next year"
                        className="btn-secondary"
                    >
                        <span className="tnum">{year + 1}</span>
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                <h1 className="voice-board tnum text-strip text-center leading-[0.85] text-[clamp(5rem,26vw,13rem)] mt-4">
                    {year}
                </h1>
            </header>

            {isEmpty ? (
                <EmptyState
                    title={`No gigs in ${year}`}
                    body="Mark a gig as one you were at, and this page fills itself in."
                    action={
                        <Link to="/" className="btn-primary">
                            Discover shows
                        </Link>
                    }
                />
            ) : (
                stats && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 border border-rail bg-board mb-10 [&>*]:px-4 [&>*]:py-5 [&>*]:border-rail [&>*:not(:nth-child(3n+1))]:border-l [&>*:nth-child(n+3)]:border-t sm:[&>*:nth-child(n+3)]:border-t-0 sm:[&>*:nth-child(n+4)]:border-t">
                            <Figure
                                value={formatNumber(stats.gigs_attended)}
                                label="Gigs been to"
                                accent
                            />
                            <Figure
                                value={formatNumber(stats.reviews_written)}
                                label="Reviews written"
                            />
                            <Figure
                                value={stats.avg_rating_given.toFixed(1)}
                                label="Average score you gave"
                            />
                            <Figure
                                value={formatNumber(stats.distinct_cities)}
                                label="Cities"
                            />
                            <Figure
                                value={formatNumber(stats.photos_uploaded)}
                                label="Photos kept"
                            />
                            <Figure
                                value={
                                    stats.first_gig_date
                                        ? formatDate(stats.first_gig_date, 'd MMM')
                                        : '—'
                                }
                                label="First one of the year"
                            />
                        </div>

                        <div className="space-y-10">
                            <TopList title="Most seen artists" entries={stats.top_artists} />
                            <TopList title="Rooms you kept going back to" entries={stats.top_venues} />
                        </div>
                    </>
                )
            )}
        </div>
    )
}
