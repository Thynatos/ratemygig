import { useState } from 'react'
import { CalendarPlus, Download, ExternalLink } from 'lucide-react'
import type { Event } from '@core/index'
import { buildGoogleCalendarUrl, buildIcs } from '@/shared/lib/ical'
import type { IcalEventInput } from '@/shared/lib/ical'
import { cn, downloadTextFile } from '@/shared/lib/utils'

interface AddToCalendarButtonProps {
    event: Event
}

function toIcalInput(event: Event): IcalEventInput {
    return {
        id: event.id,
        name: event.name,
        startAt: event.start_at,
        venueName: event.venue?.name ?? null,
        city: event.city,
        ticketUrl: event.ticket_urls[0]?.url ?? null,
    }
}

function slugify(text: string): string {
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    return slug || 'event'
}

export function AddToCalendarButton({ event }: AddToCalendarButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleDownload = () => {
        const ics = buildIcs([toIcalInput(event)])
        downloadTextFile(ics, `${slugify(event.name)}.ics`, 'text/calendar;charset=utf-8;')
        setIsOpen(false)
    }

    const handleGoogleCalendar = () => {
        window.open(buildGoogleCalendarUrl(toIcalInput(event)), '_blank', 'noopener,noreferrer')
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                    'bg-surface-800 border border-surface-600 text-surface-200',
                    'hover:bg-surface-700 hover:border-surface-500',
                    isOpen && 'border-primary-500/50'
                )}
            >
                <CalendarPlus className="w-4 h-4" />
                Add to Calendar
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 z-50 w-56 rounded-xl border border-surface-700 bg-surface-900 shadow-xl animate-scale-in">
                        <div className="p-2 space-y-1">
                            <button
                                onClick={handleDownload}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors text-left"
                            >
                                <Download className="w-4 h-4 text-surface-400 shrink-0" />
                                <span className="text-sm text-white">Download .ics</span>
                            </button>
                            <button
                                onClick={handleGoogleCalendar}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors text-left"
                            >
                                <ExternalLink className="w-4 h-4 text-surface-400 shrink-0" />
                                <span className="text-sm text-white">Google Calendar</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
