// Ticketmaster Discovery API Response Types
// Based on https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

// ============================================
// Common Types
// ============================================

export interface TmImage {
    url: string;
    ratio?: string;
    width?: number;
    height?: number;
    fallback?: boolean;
}

export interface TmLink {
    href: string;
}

export interface TmLinks {
    self?: TmLink;
    next?: TmLink;
    first?: TmLink;
    last?: TmLink;
}

export interface TmPage {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
}

// ============================================
// Venue Types
// ============================================

export interface TmVenueAddress {
    line1?: string;
    line2?: string;
}

export interface TmVenueCity {
    name: string;
}

export interface TmVenueState {
    name?: string;
    stateCode?: string;
}

export interface TmVenueCountry {
    name: string;
    countryCode: string;
}

export interface TmVenueLocation {
    longitude?: string;
    latitude?: string;
}

export interface TmVenue {
    id: string;
    name: string;
    type?: string;
    url?: string;
    locale?: string;
    images?: TmImage[];
    postalCode?: string;
    timezone?: string;
    city?: TmVenueCity;
    state?: TmVenueState;
    country?: TmVenueCountry;
    address?: TmVenueAddress;
    location?: TmVenueLocation;
    _links?: TmLinks;
}

// ============================================
// Attraction (Artist) Types
// ============================================

export interface TmClassification {
    primary?: boolean;
    segment?: { id: string; name: string };
    genre?: { id: string; name: string };
    subGenre?: { id: string; name: string };
    type?: { id: string; name: string };
    subType?: { id: string; name: string };
}

export interface TmAttraction {
    id: string;
    name: string;
    type?: string;
    url?: string;
    locale?: string;
    images?: TmImage[];
    classifications?: TmClassification[];
    _links?: TmLinks;
}

// ============================================
// Event Types
// ============================================

export interface TmEventDate {
    localDate?: string;
    localTime?: string;
    dateTime?: string;
    dateTBD?: boolean;
    dateTBA?: boolean;
    timeTBA?: boolean;
    noSpecificTime?: boolean;
}

export interface TmEventStatus {
    code: 'onsale' | 'offsale' | 'cancelled' | 'postponed' | 'rescheduled';
}

export interface TmEventSales {
    public?: {
        startDateTime?: string;
        endDateTime?: string;
        startTBD?: boolean;
        startTBA?: boolean;
    };
}

export interface TmPriceRange {
    type?: string;
    currency?: string;
    min?: number;
    max?: number;
}

export interface TmEventEmbedded {
    venues?: TmVenue[];
    attractions?: TmAttraction[];
}

export interface TmEvent {
    id: string;
    name: string;
    type?: string;
    url?: string;
    locale?: string;
    images?: TmImage[];
    dates?: {
        start?: TmEventDate;
        end?: TmEventDate;
        timezone?: string;
        status?: TmEventStatus;
    };
    sales?: TmEventSales;
    classifications?: TmClassification[];
    priceRanges?: TmPriceRange[];
    _embedded?: TmEventEmbedded;
    _links?: TmLinks;
}

// ============================================
// API Response Types
// ============================================

export interface TmEventsResponse {
    _embedded?: {
        events: TmEvent[];
    };
    _links?: TmLinks;
    page?: TmPage;
}

export interface TmVenuesResponse {
    _embedded?: {
        venues: TmVenue[];
    };
    _links?: TmLinks;
    page?: TmPage;
}

export interface TmAttractionsResponse {
    _embedded?: {
        attractions: TmAttraction[];
    };
    _links?: TmLinks;
    page?: TmPage;
}

// ============================================
// Search Parameters
// ============================================

export interface TmEventSearchParams {
    keyword?: string;
    attractionId?: string;
    venueId?: string;
    city?: string;
    countryCode?: string;
    stateCode?: string;
    classificationName?: string;
    classificationId?: string;
    startDateTime?: string;  // ISO 8601 format
    endDateTime?: string;    // ISO 8601 format
    size?: number;           // max 200
    page?: number;
    sort?: string;
    includeTest?: 'yes' | 'no' | 'only';
    source?: 'ticketmaster' | 'universe' | 'frontgate' | 'tmr';
}

export interface TmVenueSearchParams {
    keyword?: string;
    city?: string;
    countryCode?: string;
    stateCode?: string;
    size?: number;
    page?: number;
}

export interface TmAttractionSearchParams {
    keyword?: string;
    classificationName?: string;
    classificationId?: string;
    size?: number;
    page?: number;
}
