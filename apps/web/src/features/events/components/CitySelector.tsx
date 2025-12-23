import { useState, useEffect } from 'react'
import { MapPin, ChevronDown, Search } from 'lucide-react'
import { useCities } from '../api/events'
import { cn } from '@/shared/lib/utils'

interface CitySelectorProps {
    value: string
    onChange: (city: string) => void
}

const STORAGE_KEY = 'ratemygig_selected_city'

export function CitySelector({ value, onChange }: CitySelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const { data: cities = [], isLoading } = useCities()

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

    const filteredCities = cities.filter(city =>
        city.toLowerCase().includes(search.toLowerCase())
    )

    const handleSelect = (city: string) => {
        onChange(city)
        setIsOpen(false)
        setSearch('')
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                    'bg-surface-800 border border-surface-700',
                    'hover:border-surface-600 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500',
                    isOpen && 'border-primary-500'
                )}
            >
                <MapPin className="w-5 h-5 text-primary-400" />
                <span className="font-medium text-white">
                    {value || 'Select City'}
                </span>
                <ChevronDown className={cn(
                    'w-4 h-4 text-surface-400 transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-64 z-50 glass-card p-2 animate-slide-down">
                        {/* Search */}
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search cities..."
                                className="w-full pl-9 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500"
                                autoFocus
                            />
                        </div>

                        {/* Cities list */}
                        <div className="max-h-64 overflow-y-auto scrollbar-hide">
                            {isLoading ? (
                                <div className="p-4 text-center text-surface-400">Loading...</div>
                            ) : filteredCities.length === 0 ? (
                                <div className="p-4 text-center text-surface-400">No cities found</div>
                            ) : (
                                filteredCities.map(city => (
                                    <button
                                        key={city}
                                        onClick={() => handleSelect(city)}
                                        className={cn(
                                            'w-full px-3 py-2 text-left rounded-lg text-sm transition-colors',
                                            city === value
                                                ? 'bg-primary-500/20 text-primary-400'
                                                : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                                        )}
                                    >
                                        <MapPin className="inline-block w-4 h-4 mr-2" />
                                        {city}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* All cities option */}
                        <div className="mt-2 pt-2 border-t border-surface-700">
                            <button
                                onClick={() => handleSelect('')}
                                className={cn(
                                    'w-full px-3 py-2 text-left rounded-lg text-sm transition-colors',
                                    !value
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : 'text-surface-400 hover:bg-surface-800 hover:text-white'
                                )}
                            >
                                All Cities
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
