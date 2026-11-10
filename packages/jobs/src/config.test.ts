import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig ingest areas', () => {
    beforeEach(() => {
        vi.stubEnv('TICKETMASTER_API_KEY', 'test-key');
        vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role');
        vi.stubEnv('INGEST_CITIES', '');
        vi.stubEnv('INGEST_DMAS', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('reads INGEST_DMAS as a trimmed list of ids', () => {
        vi.stubEnv('INGEST_DMAS', ' 345, 324,,249 ');

        expect(loadConfig().ingest.dmaIds).toEqual(['345', '324', '249']);
    });

    it('sets no DMAs when INGEST_DMAS is empty', () => {
        expect(loadConfig().ingest.dmaIds).toEqual([]);
    });

    it('rejects a metro name in INGEST_DMAS before anything is fetched', () => {
        vi.stubEnv('INGEST_DMAS', '345,New York');

        expect(() => loadConfig()).toThrow('these are not ids: New York');
    });
});
