// Job Scheduler
// Runs jobs on a schedule using node-cron

import cron from 'node-cron';
import { runDailyIngest } from './jobs/daily-ingest.js';

console.log('Starting job scheduler...');

// Schedule daily ingestion at 3:00 AM
const dailyIngestSchedule = '0 3 * * *';

cron.schedule(dailyIngestSchedule, async () => {
    console.log('');
    console.log('Scheduled daily ingestion triggered');

    try {
        await runDailyIngest();
    } catch (error) {
        console.error('Scheduled job failed:', error);
    }
});

console.log(`Daily ingestion scheduled: ${dailyIngestSchedule} (3:00 AM daily)`);
console.log('Press Ctrl+C to stop the scheduler.');

// Keep the process running
process.on('SIGINT', () => {
    console.log('Scheduler stopped.');
    process.exit(0);
});
