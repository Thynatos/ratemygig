// Daily Events Ingestion Job
// Fetches events from Ticketmaster and syncs to database

import { loadConfig } from '../config.js';
import { TicketmasterClient, TicketmasterProvider } from '../ticketmaster/index.js';
import { SyncService, SyncStats } from '../sync/index.js';
import { pathToFileURL } from 'node:url';

export interface IngestResult {
    startTime: Date;
    endTime: Date;
    durationMs: number;
    countries: string[];
    cities: string[];
    stats: SyncStats;
}

export async function runDailyIngest(): Promise<IngestResult> {
    const startTime = new Date();
    console.log('='.repeat(60));
    console.log(`Starting daily ingestion at ${startTime.toISOString()}`);
    console.log('='.repeat(60));

    // Load configuration
    const config = loadConfig();
    console.log(`Configuration loaded:`);
    console.log(`  - Countries: ${config.ingest.countries.join(', ')}`);
    console.log(`  - Cities: ${config.ingest.cities.length > 0 ? config.ingest.cities.join(', ') : '(not set — country mode)'}`);
    console.log(`  - Classification: ${config.ingest.classification}`);
    console.log(`  - Days ahead: ${config.ingest.daysAhead}`);

    // Initialize clients
    const tmClient = new TicketmasterClient(
        config.ticketmaster.apiKey,
        config.ticketmaster.baseUrl,
        config.ticketmaster.rateLimit
    );
    const tmProvider = new TicketmasterProvider(tmClient, config.ingest.classification);
    const syncService = new SyncService(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        'ticketmaster'
    );

    // Calculate date range
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + config.ingest.daysAhead);

    console.log(`Fetching events from ${from.toISOString()} to ${to.toISOString()}`);

    // Aggregate stats
    const totalStats: SyncStats = {
        eventsCreated: 0,
        eventsUpdated: 0,
        venuesCreated: 0,
        artistsCreated: 0,
        eventArtistsLinked: 0,
        errors: [],
    };

    let batchCount = 0;
    let totalEvents = 0;

    // Fetch and sync events in batches
    for await (const events of tmProvider.fetchAllEvents({
        countries: config.ingest.countries,
        cities: config.ingest.cities,
        from,
        to,
    })) {
        batchCount++;
        totalEvents += events.length;
        console.log(`Processing batch ${batchCount}: ${events.length} events (total: ${totalEvents})`);

        const saveStart = Date.now();
        const batchStats = await syncService.syncEvents(events);
        const saveSeconds = ((Date.now() - saveStart) / 1000).toFixed(1);

        // Merge stats
        totalStats.eventsCreated += batchStats.eventsCreated;
        totalStats.eventsUpdated += batchStats.eventsUpdated;
        totalStats.venuesCreated += batchStats.venuesCreated;
        totalStats.artistsCreated += batchStats.artistsCreated;
        totalStats.eventArtistsLinked += batchStats.eventArtistsLinked;
        totalStats.errors.push(...batchStats.errors);

        console.log(
            `  Created: ${batchStats.eventsCreated}, Updated: ${batchStats.eventsUpdated}, ` +
            `Errors: ${batchStats.errors.length} (saved in ${saveSeconds}s)`
        );
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    console.log('');
    console.log('='.repeat(60));
    console.log('Daily ingestion complete!');
    console.log('='.repeat(60));
    console.log(`Duration: ${(durationMs / 1000).toFixed(2)} seconds`);
    console.log(`Total batches: ${batchCount}`);
    console.log(`Total events processed: ${totalEvents}`);
    console.log('');
    console.log('Sync Statistics:');
    console.log(`  - Events created: ${totalStats.eventsCreated}`);
    console.log(`  - Events updated: ${totalStats.eventsUpdated}`);
    console.log(`  - Venues created: ${totalStats.venuesCreated}`);
    console.log(`  - Artists created: ${totalStats.artistsCreated}`);
    console.log(`  - Event-Artist links: ${totalStats.eventArtistsLinked}`);

    if (totalStats.errors.length > 0) {
        console.log('');
        console.log(`Errors (${totalStats.errors.length}):`);
        totalStats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
        if (totalStats.errors.length > 10) {
            console.log(`  ... and ${totalStats.errors.length - 10} more errors`);
        }
    }

    return {
        startTime,
        endTime,
        durationMs,
        countries: config.ingest.countries,
        cities: config.ingest.cities,
        stats: totalStats,
    };
}

// Run if executed directly
// pathToFileURL produces a correctly-slashed file:// URL on both POSIX and
// Windows; the previous string concat never matched on Windows, so running
// `tsx src/jobs/daily-ingest.ts` locally exited 0 without doing anything.
const isMainModule = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

// Exit non-zero once more than this many events fail to sync, so CI marks the
// run red and ingest.yml files an issue. A handful of bad events in a large
// run should not page anyone; anything above this indicates systemic failure.
const MAX_SYNC_ERRORS = 50;

if (isMainModule) {
    runDailyIngest()
        .then(result => {
            if (result.stats.errors.length > MAX_SYNC_ERRORS) {
                console.error(
                    `Job finished with ${result.stats.errors.length} sync errors ` +
                    `(threshold: ${MAX_SYNC_ERRORS}). Exiting non-zero.`
                );
                process.exit(1);
            }
            console.log('');
            console.log('Job completed successfully.');
            process.exit(0);
        })
        .catch(error => {
            console.error('Job failed with error:', error);
            process.exit(1);
        });
}
