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
            cities: getEnvOrDefault('INGEST_CITIES', '').split(',').map(c => c.trim()).filter(c => c.length > 0),
            classification: getEnvOrDefault('INGEST_CLASSIFICATION', 'music'),
            daysAhead: parseInt(getEnvOrDefault('INGEST_DAYS_AHEAD', '180'), 10),
        },
    };
}
