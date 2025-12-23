// Events Provider Interface
// Pluggable abstraction for different concert data sources

import { TicketUrl } from '../types';

// ============================================
// Provider Event Types
// ============================================

export interface ProviderVenue {
    id: string;
    name: string;
    city: string;
    country: string;
    lat?: number;
    lng?: number;
}

export interface ProviderArtist {
    id: string;
    name: string;
}

export interface ProviderEvent {
    id: string;
    name: string;
    startAt: Date;
    venue: ProviderVenue;
    artists: ProviderArtist[];
    ticketUrls: TicketUrl[];
    imageUrl?: string;
}

// ============================================
// Search Parameters
// ============================================

export interface SearchEventsParams {
    city: string;
    country?: string;
    from?: Date;
    to?: Date;
    query?: string;
    page?: number;
    pageSize?: number;
}

export interface SearchEventsResult {
    events: ProviderEvent[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============================================
// Provider Interface
// ============================================

export interface IEventsProvider {
    /**
     * The unique identifier for this provider
     */
    readonly providerId: string;

    /**
     * Search for events based on filters
     */
    searchEvents(params: SearchEventsParams): Promise<SearchEventsResult>;

    /**
     * Get a single event by its provider-specific ID
     */
    getEvent(providerEventId: string): Promise<ProviderEvent | null>;

    /**
     * Get upcoming events for a specific venue
     */
    getVenueEvents?(venueId: string, params?: { from?: Date; to?: Date }): Promise<ProviderEvent[]>;

    /**
     * Get upcoming events for a specific artist
     */
    getArtistEvents?(artistId: string, params?: { from?: Date; to?: Date }): Promise<ProviderEvent[]>;
}
