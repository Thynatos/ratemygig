import { useEffect, useRef, useState } from 'react'
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
    const triggerRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen])

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
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={cn('btn-secondary', isOpen && 'bg-board-raised border-strip')}
            >
                Add to calendar
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        role="menu"
                        className="absolute left-0 top-full mt-1 z-50 w-56 border border-rail-strong bg-board shadow-lift"
                    >
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleDownload}
                            className="w-full px-3 py-2.5 text-left text-ui text-bone border-b border-rail transition-colors duration-150 ease-board hover:bg-board-raised"
                        >
                            Download .ics file
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleGoogleCalendar}
                            className="w-full px-3 py-2.5 text-left text-ui text-bone transition-colors duration-150 ease-board hover:bg-board-raised"
                        >
                            Open in Google Calendar
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
