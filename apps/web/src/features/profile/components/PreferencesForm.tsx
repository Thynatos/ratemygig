import { useState } from 'react'
import {
    useUserPreferences,
    useUpdatePreferences,
    useClearPreferences,
} from '@/features/discovery/api/preferences'
import { useGeolocation } from '@/shared/hooks/useGeolocation'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/lib/utils'
import type { UserPreferences } from '@core/index'

type NotifyKey = keyof Pick<
    UserPreferences,
    | 'notify_artist_events'
    | 'notify_venue_events'
    | 'notify_new_reviews'
    | 'notify_comments'
    | 'notify_reactions'
>

const NOTIFICATION_TOGGLES: { key: NotifyKey; label: string; description: string }[] = [
    {
        key: 'notify_artist_events',
        label: 'New dates from artists you follow',
        description: 'When someone you follow announces a gig.',
    },
    {
        key: 'notify_venue_events',
        label: 'New dates at rooms you follow',
        description: 'When a venue you follow puts something on.',
    },
    {
        key: 'notify_new_reviews',
        label: 'Reviews from people you follow',
        description: 'When a gig-goer you follow rates a night.',
    },
    {
        key: 'notify_comments',
        label: 'Replies to your reviews',
        description: 'When someone replies to something you wrote.',
    },
    {
        key: 'notify_reactions',
        label: 'Reactions to your reviews',
        description: 'When someone marks one of your reviews.',
    },
]

interface ToggleSwitchProps {
    checked: boolean
    onChange: (value: boolean) => void
    label: string
}

/** The same printed switch used everywhere: amber when on, groove when off. */
function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative shrink-0 w-14 h-7 border transition-colors duration-150 ease-board',
                checked ? 'bg-strip border-strip' : 'bg-groove border-rail-strong'
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'absolute top-[3px] w-5 h-5 transition-transform duration-150 ease-board',
                    checked ? 'translate-x-[30px] bg-strip-ink' : 'translate-x-[3px] bg-bone-faint'
                )}
            />
        </button>
    )
}

export function PreferencesForm() {
    const { data: preferences, isLoading } = useUserPreferences()
    const updatePrefs = useUpdatePreferences()
    const clearPrefs = useClearPreferences()
    const { latitude, longitude, isLoading: geoLoading, requestLocation } = useGeolocation()

    const [city, setCity] = useState(preferences?.preferred_city ?? '')

    const handleSaveCity = () => {
        updatePrefs.mutate({ preferred_city: city })
    }

    const handleUseMyLocation = async () => {
        requestLocation()
        if (latitude !== null && longitude !== null) {
            updatePrefs.mutate({
                preferred_lat: latitude,
                preferred_lng: longitude,
                preferred_city: city || null,
            })
        }
    }

    const handleClear = () => {
        clearPrefs.mutate()
        setCity('')
    }

    if (isLoading) return null

    const hasPreference = Boolean(
        preferences && (preferences.preferred_city || preferences.preferred_lat)
    )

    return (
        <section className="border border-rail bg-board">
            <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                Where you go, and what to tell you
            </h2>

            <div className="p-4 border-b border-rail space-y-4">
                <div>
                    <label htmlFor="preferred-city" className="input-label">
                        Your city
                    </label>
                    <div className="flex gap-2">
                        <Input
                            id="preferred-city"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="Manchester"
                            className="flex-1"
                        />
                        <Button
                            variant="secondary"
                            onClick={handleSaveCity}
                            isLoading={updatePrefs.isPending}
                            loadingLabel="Saving your city"
                        >
                            Save
                        </Button>
                    </div>
                    <p className="input-hint">
                        Discover opens here, and recommendations start from it.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleUseMyLocation}
                        isLoading={geoLoading}
                        loadingLabel="Finding you"
                    >
                        Use my location instead
                    </Button>
                    {preferences?.preferred_lat && preferences?.preferred_lng && (
                        <span className="voice-data text-ui-sm text-bone-faint">
                            {preferences.preferred_lat.toFixed(2)},{' '}
                            {preferences.preferred_lng.toFixed(2)}
                        </span>
                    )}
                </div>

                {hasPreference && (
                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-rail">
                        <p className="text-ui-sm text-bone-dim">
                            Currently set to{' '}
                            <span className="text-bone">
                                {preferences!.preferred_city || 'your location'}
                            </span>
                            .
                        </p>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="voice-label text-bone-faint hover:text-bone underline"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="voice-label text-bone-dim mb-1">Notifications</h3>
                <p className="text-ui-sm text-bone-faint mb-4">
                    Turn off anything you don't want to hear about.
                </p>
                <ul className="divide-y divide-rail">
                    {NOTIFICATION_TOGGLES.map(toggle => (
                        <li
                            key={toggle.key}
                            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                        >
                            <div>
                                <p className="text-ui text-bone">{toggle.label}</p>
                                <p className="text-ui-sm text-bone-faint">{toggle.description}</p>
                            </div>
                            <ToggleSwitch
                                checked={preferences?.[toggle.key] ?? true}
                                onChange={value => updatePrefs.mutate({ [toggle.key]: value })}
                                label={toggle.label}
                            />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
