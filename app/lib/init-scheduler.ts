// This file initializes the daily closing scheduler when the Next.js app starts
// It should be imported in the root layout or app initialization

import { startDailyClosingScheduler } from './scheduler';

// Only start scheduler in production or when explicitly enabled
const ENABLE_SCHEDULER = process.env.ENABLE_DAILY_SCHEDULER === 'true' || process.env.NODE_ENV === 'production';

if (typeof window === 'undefined' && ENABLE_SCHEDULER) {
  // Only run on server side
  console.log('Initializing daily closing scheduler...');

  try {
    const scheduler = startDailyClosingScheduler();
    console.log('Daily closing scheduler started successfully');

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, stopping scheduler...');
      scheduler.stop();
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, stopping scheduler...');
      scheduler.stop();
    });
  } catch (error) {
    console.error('Failed to start daily closing scheduler:', error);
  }
} else if (typeof window === 'undefined') {
  console.log('Daily closing scheduler disabled. Set ENABLE_DAILY_SCHEDULER=true to enable.');
}