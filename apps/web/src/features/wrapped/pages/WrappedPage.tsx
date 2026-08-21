import { Link, useSearchParams } from 'react-router-dom'
import {
    Sparkles,
    Calendar,
    Star,
    Camera,
    MapPin,
    Music,
    Building2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useYearStats, resolveWrappedYear, MIN_WRAPPED_YEAR } from '@/features/wrapped/api/yearStats'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { formatDate, formatNumber } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { YearStatEntry } from '@core/index'

function StatCard({ icon: Icon, label, value, color }: {
    icon: typeof Star
    label: string
    value: string
    color: string
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="text-center">
                    <Icon className={color + ' w-5 h-5 mx-auto mb-1'} />
                    <div className="text-lg font-bold text-white">{value}</div>
                    <div className="text-xs text-surface-400">{label}</div>
                </div>
            </CardContent>
        </Card>
    )
}

function TopList({ title, icon: Icon, entries }: {
    title: string
    icon: typeof Star
    entries: YearStatEntry[]
    }) {
    if (entries.length === 0) return null
    return (
        <Card>
            <CardContent className="p-5">
                <h2 className="font-semibold text-lg text-white flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-primary-400" />
                    {title}
                </h2>
                <div className="space-y-3">
                    {entries.map((entry, index) => (
                        <div key={entry.name + index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/10 text-primary-400 font-bold text-sm">
                                    {index + 1}
                                </div>
                                <span className="text-white">{sanitizeText(entry.name)}</span>
                            </div>
                            <span className="text-sm text-surface-400">{formatNumber(entry.count)} gigs</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
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

    if (isLoading) return <LoadingPage message={`Crunching your ${year}...`} />

    const isEmpty = !stats || stats.gigs_attended === 0

    return (
        <div className="page-container max-w-2xl mx-auto">
            <div className="mb-8 text-center">
                <h1 className="section-title flex items-center justify-center gap-3">
                    <Sparkles className="w-8 h-8 text-accent-400" />
                    Your Year in Review
                </h1>
                <p className="section-subtitle">Your gig story, one year at a time</p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => goToYear(year - 1)}
                    disabled={year <= MIN_WRAPPED_YEAR}
                    aria-label="Previous year"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold text-white min-w-20 text-center">{year}</span>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => goToYear(year + 1)}
                    disabled={year >= currentYear}
                    aria-label="Next year"
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {isEmpty ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Sparkles className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No gigs in {year}</h3>
                        <p className="text-surface-400 mb-6">
                            Mark events as attended to start building your year in review
                        </p>
                        <Link to="/">
                            <Button>Discover shows</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                stats && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                            <StatCard icon={Calendar} label="Gigs attended" value={formatNumber(stats.gigs_attended)} color="text-primary-400" />
                            <StatCard icon={Star} label="Reviews written" value={formatNumber(stats.reviews_written)} color="text-yellow-400" />
                            <StatCard icon={Star} label="Average rating" value={stats.avg_rating_given.toFixed(1)} color="text-accent-400" />
                            <StatCard icon={Camera} label="Photos uploaded" value={formatNumber(stats.photos_uploaded)} color="text-pink-400" />
                            <StatCard icon={MapPin} label="Cities visited" value={formatNumber(stats.distinct_cities)} color="text-green-400" />
                            <StatCard
                                icon={Calendar}
                                label="First gig"
                                value={stats.first_gig_date ? formatDate(stats.first_gig_date, 'MMM d') : '—'}
                                color="text-surface-400"
                            />
                        </div>

                        <div className="space-y-4">
                            <TopList title="Top Artists" icon={Music} entries={stats.top_artists} />
                            <TopList title="Top Venues" icon={Building2} entries={stats.top_venues} />
                        </div>
                    </>
                )
            )}
        </div>
    )
}
