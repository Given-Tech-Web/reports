import { NextRequest, NextResponse } from 'next/server';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

// POST: Execute daily closing for a specific date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, deviceId = 'solar_system_001' } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Starting daily closing for ${date}, device: ${deviceId}`);

    // First, check if daily_inverter_stats table exists, if not create it
    // Simplified table structure to match what's being used
    await db.query(
      `CREATE TABLE IF NOT EXISTS daily_inverter_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        total_energy_generated DECIMAL(10,4),
        total_carbon_reduction DECIMAL(10,4),
        avg_battery_capacity DECIMAL(5,2),
        max_pv1_charging_power DECIMAL(10,2),
        avg_load_percentage DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_device_date (device_id, date),
        INDEX idx_device_id (device_id),
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // Add timestamp columns to existing table if they don't exist
    try {
      await db.query(
        `ALTER TABLE daily_inverter_stats
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
      );
    } catch {
      // Ignore error if columns already exist or if ALTER TABLE fails
      console.log('Timestamp columns may already exist');
    }

    // Calculate aggregated data from raw_inverter_data
    const aggregateResults = await db.query<any[]>(
      `SELECT
        ? as device_id,
        ? as date,
        -- Energy calculation: power (W) * time (30 seconds = 1/120 hour) = kWh
        SUM(pv1_charging_power / 1000 * ?) as total_energy_generated,
        -- Carbon reduction: energy * carbon factor
        SUM(pv1_charging_power / 1000 * ? * ?) as total_carbon_reduction,
        AVG(battery_capacity) as avg_battery_capacity,
        MAX(pv1_charging_power) as max_pv1_charging_power,
        AVG(load_percentage) as avg_load_percentage,
        MIN(battery_capacity) as min_battery_capacity,
        -- Operating hours: count of records * 30 seconds / 3600
        COUNT(*) * 30 / 3600 as total_operating_hours,
        COUNT(*) as records_count
      FROM raw_inverter_data
      WHERE device_id = ?
        AND DATE(timestamp) = ?`,
      [deviceId, date, DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, date]
    );

    const aggregatedData = aggregateResults[0];

    // Check if there's data to process
    if (!aggregatedData || aggregatedData.records_count === 0) {
      return NextResponse.json({
        success: false,
        message: `No data found for ${date}`,
        device_id: deviceId,
        date: date
      });
    }

    // Insert or update daily_inverter_stats using ON DUPLICATE KEY UPDATE
    // Note: Simplified to match existing table structure
    await db.query(
      `INSERT INTO daily_inverter_stats (
        device_id,
        date,
        total_energy_generated,
        total_carbon_reduction,
        avg_battery_capacity,
        max_pv1_charging_power,
        avg_load_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_energy_generated = VALUES(total_energy_generated),
        total_carbon_reduction = VALUES(total_carbon_reduction),
        avg_battery_capacity = VALUES(avg_battery_capacity),
        max_pv1_charging_power = VALUES(max_pv1_charging_power),
        avg_load_percentage = VALUES(avg_load_percentage)`,
      [
        aggregatedData.device_id,
        aggregatedData.date,
        aggregatedData.total_energy_generated || 0,
        aggregatedData.total_carbon_reduction || 0,
        aggregatedData.avg_battery_capacity || 0,
        aggregatedData.max_pv1_charging_power || 0,
        aggregatedData.avg_load_percentage || 0
      ]
    );

    console.log(`Daily closing completed for ${date}`);

    return NextResponse.json({
      success: true,
      message: `Daily closing completed for ${date}`,
      device_id: deviceId,
      date: date,
      summary: {
        total_energy_kwh: parseFloat(aggregatedData.total_energy_generated) || 0,
        total_carbon_kg: parseFloat(aggregatedData.total_carbon_reduction) || 0,
        avg_battery_capacity: parseFloat(aggregatedData.avg_battery_capacity) || 0,
        peak_power_w: parseFloat(aggregatedData.max_pv1_charging_power) || 0,
        records_processed: aggregatedData.records_count || 0,
        operating_hours: parseFloat(aggregatedData.total_operating_hours) || 0
      }
    });

  } catch (error: any) {
    console.error('Error in daily closing:', error.message);
    return NextResponse.json(
      { error: 'Daily closing failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Check closing status for a date or batch close multiple dates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';
  const action = searchParams.get('action');

  try {
    // Batch closing for missing dates
    if (action === 'close-missing') {
      const daysBack = parseInt(searchParams.get('days') || '30');

      // Find dates that have data but no closing record
      const missingDates = await db.query<any[]>(
        `SELECT DISTINCT DATE(timestamp) as missing_date
        FROM raw_inverter_data r
        WHERE r.device_id = ?
          AND DATE(r.timestamp) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND DATE(r.timestamp) < CURDATE()
          AND NOT EXISTS (
            SELECT 1 FROM daily_inverter_stats d
            WHERE d.device_id = r.device_id
              AND d.date = DATE(r.timestamp)
          )
        ORDER BY missing_date`,
        [deviceId, daysBack]
      );

      const dates = missingDates.map(row => row.missing_date);

      return NextResponse.json({
        device_id: deviceId,
        missing_dates: dates,
        count: dates.length,
        message: `Found ${dates.length} dates requiring closing`,
        instruction: 'Call POST endpoint for each date to execute closing'
      });
    }

    // Check specific date status
    if (date) {
      const closingStatus = await db.query<any[]>(
        `SELECT * FROM daily_inverter_stats
         WHERE device_id = ? AND date = ?`,
        [deviceId, date]
      );

      const hasClosed = closingStatus.length > 0;
      const closedData = hasClosed ? closingStatus[0] : null;

      return NextResponse.json({
        device_id: deviceId,
        date: date,
        is_closed: hasClosed,
        closed_data: closedData,
        message: hasClosed
          ? `Daily closing completed for ${date}`
          : `No closing record found for ${date}`
      });
    }

    // Return recent closing status
    const recentClosings = await db.query<any[]>(
      `SELECT date, total_energy_generated, total_carbon_reduction, created_at, updated_at
       FROM daily_inverter_stats
       WHERE device_id = ?
       ORDER BY date DESC
       LIMIT 7`,
      [deviceId]
    );

    return NextResponse.json({
      device_id: deviceId,
      recent_closings: recentClosings,
      count: recentClosings.length
    });

  } catch (error: any) {
    console.error('Error checking closing status:', error.message);
    return NextResponse.json(
      { error: 'Failed to check closing status', details: error.message },
      { status: 500 }
    );
  }
}
