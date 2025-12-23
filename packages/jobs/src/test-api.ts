// Test script for Ticketmaster API connectivity
// Run with: npm run test:api

import { loadConfig } from './config.js';
import { TicketmasterClient, TicketmasterProvider } from './ticketmaster/index.js';

async function testApi() {
    console.log('Testing Ticketmaster API connectivity...\n');

    try {
        const config = loadConfig();
        console.log('✓ Configuration loaded successfully');
        console.log(`  API Key: ${config.ticketmaster.apiKey.substring(0, 8)}...`);
        console.log('');

        const client = new TicketmasterClient(
            config.ticketmaster.apiKey,
            config.ticketmaster.baseUrl,
            config.ticketmaster.rateLimit
        );
        const provider = new TicketmasterProvider(client, config.ingest.classification);

        // Test event search
        console.log('Testing event search...');
        const searchResult = await provider.searchEvents({
            country: config.ingest.countries[0],
            pageSize: 5,
        });

        console.log(`✓ Found ${searchResult.totalCount} events in ${config.ingest.countries[0]}`);
        console.log('');
        console.log('Sample events:');
        searchResult.events.forEach((event, i) => {
            console.log(`  ${i + 1}. ${event.name}`);
            console.log(`     📍 ${event.venue.name}, ${event.venue.city}`);
            console.log(`     📅 ${event.startAt.toLocaleDateString()}`);
            console.log(`     🎤 ${event.artists.map(a => a.name).join(', ') || 'N/A'}`);
            console.log('');
        });

        console.log('✓ API test completed successfully!');
        console.log('');
        console.log('You can now run the full ingestion with:');
        console.log('  npm run jobs:ingest');

    } catch (error) {
        console.error('✗ API test failed:', error);
        console.error('');
        console.error('Please check:');
        console.error('  1. Your TICKETMASTER_API_KEY environment variable is set');
        console.error('  2. The API key is valid');
        console.error('  3. You have network connectivity');
        process.exit(1);
    }
}

testApi();
