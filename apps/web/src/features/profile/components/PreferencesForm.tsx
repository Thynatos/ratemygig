import { useState } from 'react'
import { MapPin, RotateCcw, Bell } from 'lucide-react'
import { useUserPreferences, useUpdatePreferences, useClearPreferences } from '@/features/discovery/api/preferences'
import { useGeolocation } from '@/shared/hooks/useGeolocation'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent } from '@/shared/components/ui/Card'
import type { UserPreferences } from '@core/index'

type NotifyKey = keyof Pick<UserPreferences, 'notify_artist_events' | 'notify_venue_events' | 'notify_new_reviews' | 'notify_comments' | 'notify_reactions'>

const NOTIFICATION_TOGGLES: { key: NotifyKey; label: string; description: string }[] = [
    { key: 'notify_artist_events', label: 'Artist events', description: 'New events from artists you follow' },
    { key: 'notify_venue_events', label: 'Venue events', description: 'New events at venues you follow' },
    { key: 'notify_new_reviews', label: 'New reviews', description: 'Reviews from people you follow' },
    { key: 'notify_comments', label: 'Comments', description: 'Comments on your reviews' },
    { key: 'notify_reactions', label: 'Reactions', description: 'Reactions to your reviews' },
]

interface ToggleSwitchProps {
    checked: boolean
    onChange: (value: boolean) => void
    label: string
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-surface-600'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
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

    return (
        <Card>
            <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent-400" />
                    Discovery Preferences
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-surface-400 mb-1">Preferred City</label>
                        <div className="flex gap-2">
                            <Input
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                placeholder="e.g. London"
                                className="flex-1"
                            />
                            <Button
                                variant="secondary"
                                onClick={handleSaveCity}
                                isLoading={updatePrefs.isPending}
                                size="sm"
                            >
                                Save
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleUseMyLocation}
                            isLoading={geoLoading}
                            size="sm"
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Use My Location
                        </Button>
                        {preferences?.preferred_lat && preferences?.preferred_lng && (
                            <span className="text-xs text-surface-500">
                                Location saved ({preferences.preferred_lat.toFixed(2)}, {preferences.preferred_lng.toFixed(2)})
                            </span>
                        )}
                    </div>

                    {preferences && (preferences.preferred_city || preferences.preferred_lat) && (
                        <div className="pt-2 border-t border-surface-700">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-surface-300">
                                    Current preference: {preferences.preferred_city || 'Location-based'}
                                </span>
                                <Button variant="ghost" size="sm" onClick={handleClear}>
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reset
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-surface-700">
                        <h4 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-primary-400" />
                            Notifications
                        </h4>
                        <p className="text-xs text-surface-500 mb-3">
                            Choose what you want to be notified about.
                        </p>
                        <div className="space-y-3">
                            {NOTIFICATION_TOGGLES.map(toggle => (
                                <div key={toggle.key} className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-sm text-surface-200">{toggle.label}</div>
                                        <div className="text-xs text-surface-500">{toggle.description}</div>
                                    </div>
                                    <ToggleSwitch
                                        checked={preferences?.[toggle.key] ?? true}
                                        onChange={value => updatePrefs.mutate({ [toggle.key]: value })}
                                        label={toggle.label}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}