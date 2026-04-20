import { useState, useCallback } from 'react'

interface GeolocationState {
    latitude: number | null
    longitude: number | null
    error: string | null
    isLoading: boolean
    isSupported: boolean
}

export function useGeolocation() {
    const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

    const [state, setState] = useState<GeolocationState>({
        latitude: null,
        longitude: null,
        error: null,
        isLoading: false,
        isSupported,
    })

    const requestLocation = useCallback(() => {
        if (!isSupported) {
            setState(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }))
            return
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }))

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setState({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    error: null,
                    isLoading: false,
                    isSupported,
                })
            },
            (err) => {
                let message = 'Unable to retrieve your location'
                if (err.code === err.PERMISSION_DENIED) {
                    message = 'Location access was denied'
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    message = 'Location information is unavailable'
                } else if (err.code === err.TIMEOUT) {
                    message = 'Location request timed out'
                }
                setState(prev => ({
                    ...prev,
                    error: message,
                    isLoading: false,
                }))
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000,
            }
        )
    }, [isSupported])

    return { ...state, requestLocation }
}