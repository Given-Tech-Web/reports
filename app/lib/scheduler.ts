import * as cron from 'node-cron';

// Daily closing scheduler for MySolar Reports System
export class DailyClosingScheduler {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor() {
    this.initializeScheduler();
  }

  private initializeScheduler() {
    // Schedule daily closing at 00:05 every day (5 minutes after midnight)
    // This gives time for all data from the previous day to be recorded
    this.task = cron.schedule('5 0 * * *', async () => {
      await this.executeDailyClosing();
    }, {
      timezone: 'Asia/Seoul' // Korean timezone
    });

    console.log('Daily closing scheduler initialized (not started)');
  }

  // Execute daily closing for yesterday's data
  private async executeDailyClosing() {
    if (this.isRunning) {
      console.log('Daily closing already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log(`Starting automatic daily closing for ${dateStr}`);

    try {
      // Call the daily-closing API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reports/daily-closing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateStr,
          deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`Daily closing successful for ${dateStr}:`, result.summary);
      } else {
        console.error(`Daily closing failed for ${dateStr}:`, result.message);
      }
    } catch (error) {
      console.error(`Error during daily closing for ${dateStr}:`, error);
    } finally {
      this.isRunning = false;
    }
  }

  // Manually trigger daily closing for a specific date
  public async executeManualClosing(date: string) {
    console.log(`Manual daily closing triggered for ${date}`);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reports/daily-closing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date,
          deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error during manual closing for ${date}:`, error);
      throw error;
    }
  }

  // Close all missing dates within a range
  public async closeMissingDates(daysBack = 30) {
    console.log(`Checking for missing closings in the last ${daysBack} days`);

    try {
      // First, get the list of missing dates
      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reports/daily-closing?action=close-missing&days=${daysBack}&deviceId=${process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'}`
      );

      const missingData = await checkResponse.json();

      if (missingData.missing_dates && missingData.missing_dates.length > 0) {
        console.log(`Found ${missingData.missing_dates.length} dates requiring closing`);

        const results = [];
        for (const dateStr of missingData.missing_dates) {
          const formattedDate = new Date(dateStr).toISOString().split('T')[0];
          console.log(`Closing data for ${formattedDate}`);

          try {
            const result = await this.executeManualClosing(formattedDate);
            results.push({ date: formattedDate, success: result.success });

            // Add a small delay between requests to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            results.push({ date: formattedDate, success: false, error });
          }
        }

        return {
          processed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          details: results
        };
      } else {
        return {
          message: 'No missing dates found',
          processed: 0
        };
      }
    } catch (error) {
      console.error('Error closing missing dates:', error);
      throw error;
    }
  }

  // Start the scheduler
  public start() {
    if (this.task) {
      this.task.start();
      console.log('Daily closing scheduler started');

      // Also close any missing dates on startup
      this.closeMissingDates().then(result => {
        console.log('Initial missing dates closing completed:', result);
      }).catch(error => {
        console.error('Error closing missing dates on startup:', error);
      });
    }
  }

  // Stop the scheduler
  public stop() {
    if (this.task) {
      this.task.stop();
      console.log('Daily closing scheduler stopped');
    }
  }

  // Check if scheduler is running
  public isSchedulerRunning(): boolean {
    return this.task ? (this.task as any).running : false;
  }
}

// Create a singleton instance
let schedulerInstance: DailyClosingScheduler | null = null;

export function getDailyClosingScheduler(): DailyClosingScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new DailyClosingScheduler();
  }
  return schedulerInstance;
}

// Export function to start scheduler (can be called from app initialization)
export function startDailyClosingScheduler() {
  const scheduler = getDailyClosingScheduler();
  scheduler.start();
  return scheduler;
}