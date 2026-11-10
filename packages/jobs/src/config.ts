// Configuration for the jobs package
import 'dotenv/config';

export interface JobsConfig {
    ticketmaster: {
        apiKey: string;
        baseUrl: string;
        rateLimit: number;  // requests per second
    };
    supabase: {
        url: string;
        serviceRoleKey: string;
    };
    ingest: {
        countries: string[];
        cities: string[];
        dmaIds: string[];
        classification: string;
        daysAhead: number;
    };
}

function getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

function getEnvList(key: string): string[] {
    return getEnvOrDefault(key, '').split(',').map(c => c.trim()).filter(c => c.length > 0);
}

// Ticketmaster answers a non-numeric dmaId with a 400, which would fail the
// whole run; catch a metro name pasted in by mistake before any request
function getDmaIds(): string[] {
    const ids = getEnvList('INGEST_DMAS');
    const invalid = ids.filter(id => !/^\d+$/.test(id));
    if (invalid.length > 0) {
        throw new Error(
            `INGEST_DMAS takes Ticketmaster DMA ids, e.g. 345,324 (see DEPLOYMENT.md); ` +
            `these are not ids: ${invalid.join(', ')}`
        );
    }
    return ids;
}

export function loadConfig(): JobsConfig {
    return {
        ticketmaster: {
            apiKey: getEnvOrThrow('TICKETMASTER_API_KEY'),
            baseUrl: 'https://app.ticketmaster.com/discovery/v2',
            rateLimit: 5,  // 5 requests per second as per API docs
        },
        supabase: {
            url: getEnvOrThrow('SUPABASE_URL'),
            serviceRoleKey: getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
        },
        ingest: {
            countries: getEnvOrDefault('INGEST_COUNTRIES', 'US').split(',').map(c => c.trim()),
            cities: getEnvList('INGEST_CITIES'),
            dmaIds: getDmaIds(),
            classification: getEnvOrDefault('INGEST_CLASSIFICATION', 'music'),
            daysAhead: parseInt(getEnvOrDefault('INGEST_DAYS_AHEAD', '180'), 10),
        },
    };
}
