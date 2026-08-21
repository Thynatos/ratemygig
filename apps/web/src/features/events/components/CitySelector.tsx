import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCities } from '../api/events'
import { cn } from '@/shared/lib/utils'

interface CitySelectorProps {
    value: string
    onChange: (city: string) => void
}

const STORAGE_KEY = 'ratemygig_selected_city'

/** The city switcher: a slot on the board that drops open into a rail list. */
export function CitySelector({ value, onChange }: CitySelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const { data: cities = [], isLoading } = useCities()
    const triggerRef = useRef<HTMLButtonElement>(null)

    // Load saved city on mount
    useEffect(() => {
        if (!value) {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved && cities.includes(saved)) {
                onChange(saved)
            } else if (cities.length > 0) {
                onChange(cities[0])
            }
        }
    }, [cities, value, onChange])

    // Save selection
    useEffect(() => {
        if (value) {
            localStorage.setItem(STORAGE_KEY, value)
        }
    }, [value])

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

    const filteredCities = cities.filter(city =>
        city.toLowerCase().includes(search.toLowerCase())
    )

    const handleSelect = (city: string) => {
        onChange(city)
        setIsOpen(false)
        setSearch('')
        triggerRef.current?.focus()
    }

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={cn(
                    'flex w-full items-center justify-between gap-2 border bg-groove px-3 py-[0.5625rem] text-left',
                    'transition-colors duration-150 ease-board',
                    isOpen ? 'border-strip' : 'border-rail-strong hover:border-bone-faint'
                )}
            >
                <span className="min-w-0">
                    <span className="block voice-label text-bone-faint">City</span>
                    <span className="block truncate voice-slot text-ui text-bone mt-1">
                        {value || 'Everywhere'}
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        'w-4 h-4 shrink-0 text-bone-dim transition-transform duration-150 ease-board',
                        isOpen && 'rotate-180'
                    )}
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    <div
                        role="listbox"
                        aria-label="Choose a city"
                        className="absolute top-full left-0 mt-1 w-full min-w-[15rem] z-50 border border-rail-strong bg-board shadow-lift"
                    >
                        <div className="p-2 border-b border-rail">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Filter cities"
                                aria-label="Filter cities"
                                className="input-field py-1.5 text-ui-sm"
                                autoFocus
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            {isLoading ? (
                                <p className="px-3 py-4 text-ui-sm text-bone-faint">
                                    Loading cities
                                </p>
                            ) : filteredCities.length === 0 ? (
                                <p className="px-3 py-4 text-ui-sm text-bone-faint">
                                    No city matches “{search}”.
                                </p>
                            ) : (
                                filteredCities.map(city => (
                                    <button
                                        key={city}
                                        type="button"
                                        role="option"
                                        aria-selected={city === value}
                                        onClick={() => handleSelect(city)}
                                        className={cn(
                                            'w-full px-3 py-2 text-left text-ui transition-colors duration-150 ease-board',
                                            city === value
                                                ? 'bg-board-raised text-strip'
                                                : 'text-bone-dim hover:bg-board-raised hover:text-bone'
                                        )}
                                    >
                                        {city}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="border-t border-rail">
                            <button
                                type="button"
                                role="option"
                                aria-selected={!value}
                                onClick={() => handleSelect('')}
                                className={cn(
                                    'w-full px-3 py-2 text-left voice-label transition-colors duration-150 ease-board',
                                    !value
                                        ? 'text-strip bg-board-raised'
                                        : 'text-bone-faint hover:bg-board-raised hover:text-bone'
                                )}
                            >
                                Everywhere
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
