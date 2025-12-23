// Daily Events Ingestion Job
// Fetches events from Ticketmaster and syncs to database

import { loadConfig } from '../config.js';
import { TicketmasterClient, TicketmasterProvider } from '../ticketmaster/index.js';
import { SyncService, SyncStats } from '../sync/index.js';

export interface IngestResult {
    startTime: Date;
    endTime: Date;
    durationMs: number;
    countries: string[];
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
        from,
        to,
    })) {
        batchCount++;
        totalEvents += events.length;
        console.log(`Processing batch ${batchCount}: ${events.length} events (total: ${totalEvents})`);

        const batchStats = await syncService.syncEvents(events);

        // Merge stats
        totalStats.eventsCreated += batchStats.eventsCreated;
        totalStats.eventsUpdated += batchStats.eventsUpdated;
        totalStats.venuesCreated += batchStats.venuesCreated;
        totalStats.artistsCreated += batchStats.artistsCreated;
        totalStats.eventArtistsLinked += batchStats.eventArtistsLinked;
        totalStats.errors.push(...batchStats.errors);

        console.log(`  Created: ${batchStats.eventsCreated}, Updated: ${batchStats.eventsUpdated}`);
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
        stats: totalStats,
    };
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
    runDailyIngest()
        .then(result => {
            console.log('');
            console.log('Job completed successfully.');
            process.exit(0);
        })
        .catch(error => {
            console.error('Job failed with error:', error);
            process.exit(1);
        });
}
