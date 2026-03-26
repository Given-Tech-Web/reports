import { NextRequest, NextResponse } from 'next/server';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

// POST: Execute monthly closing for a specific month
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, deviceId = 'solar_system_001' } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Year and month parameters are required' },
        { status: 400 }
      );
    }

    console.log(`Starting monthly closing for ${year}-${month}, device: ${deviceId}`);

    // Create monthly_inverter_stats table if not exists
    await db.query(
      `CREATE TABLE IF NOT EXISTS monthly_inverter_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(50) NOT NULL,
        year INT NOT NULL,
        month INT NOT NULL,
        total_energy_generated DECIMAL(12,4),
        total_carbon_reduction DECIMAL(12,4),
        avg_battery_capacity DECIMAL(5,2),
        max_pv1_charging_power DECIMAL(10,2),
        avg_load_percentage DECIMAL(5,2),
        days_operated INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_device_year_month (device_id, year, month),
        INDEX idx_device_id (device_id),
        INDEX idx_year_month (year, month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // First check if daily_inverter_stats has data for this month
    const dailyStats = await db.query<any[]>(
      `SELECT
        COUNT(*) as days_with_data,
        SUM(total_energy_generated) as total_energy,
        SUM(total_carbon_reduction) as total_carbon,
        AVG(avg_battery_capacity) as avg_battery,
        MAX(max_pv1_charging_power) as max_power,
        AVG(avg_load_percentage) as avg_load
      FROM daily_inverter_stats
      WHERE device_id = ?
        AND YEAR(date) = ?
        AND MONTH(date) = ?`,
      [deviceId, year, month]
    );

    const dailyData = dailyStats[0];

    // If daily stats exist, use them; otherwise aggregate from raw data
    let monthlyData;
    if (dailyData && dailyData.days_with_data > 0) {
      monthlyData = {
        device_id: deviceId,
        year: year,
        month: month,
        total_energy_generated: dailyData.total_energy,
        total_carbon_reduction: dailyData.total_carbon,
        avg_battery_capacity: dailyData.avg_battery,
        max_pv1_charging_power: dailyData.max_power,
        avg_load_percentage: dailyData.avg_load,
        days_operated: dailyData.days_with_data
      };
    } else {
      // Aggregate from raw_inverter_data
      const rawStats = await db.query<any[]>(
        `SELECT
          ? as device_id,
          ? as year,
          ? as month,
          SUM(pv1_charging_power / 1000 * ?) as total_energy_generated,
          SUM(pv1_charging_power / 1000 * ? * ?) as total_carbon_reduction,
          AVG(battery_capacity) as avg_battery_capacity,
          MAX(pv1_charging_power) as max_pv1_charging_power,
          AVG(load_percentage) as avg_load_percentage,
          COUNT(DISTINCT DATE(timestamp)) as days_operated
        FROM raw_inverter_data
        WHERE device_id = ?
          AND YEAR(timestamp) = ?
          AND MONTH(timestamp) = ?`,
        [deviceId, year, month, DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, year, month]
      );

      monthlyData = rawStats[0];
    }

    // Check if there's data to process
    if (!monthlyData || (!monthlyData.days_operated && !dailyData.days_with_data)) {
      return NextResponse.json({
        success: false,
        message: `No data found for ${year}-${String(month).padStart(2, '0')}`,
        device_id: deviceId
      });
    }

    // Insert or update monthly_inverter_stats
    await db.query(
      `INSERT INTO monthly_inverter_stats (
        device_id, year, month,
        total_energy_generated,
        total_carbon_reduction,
        avg_battery_capacity,
        max_pv1_charging_power,
        avg_load_percentage,
        days_operated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_energy_generated = VALUES(total_energy_generated),
        total_carbon_reduction = VALUES(total_carbon_reduction),
        avg_battery_capacity = VALUES(avg_battery_capacity),
        max_pv1_charging_power = VALUES(max_pv1_charging_power),
        avg_load_percentage = VALUES(avg_load_percentage),
        days_operated = VALUES(days_operated),
        updated_at = CURRENT_TIMESTAMP`,
      [
        monthlyData.device_id,
        monthlyData.year,
        monthlyData.month,
        monthlyData.total_energy_generated || 0,
        monthlyData.total_carbon_reduction || 0,
        monthlyData.avg_battery_capacity || 0,
        monthlyData.max_pv1_charging_power || 0,
        monthlyData.avg_load_percentage || 0,
        monthlyData.days_operated || 0
      ]
    );

    console.log(`Monthly closing completed for ${year}-${month}`);

    return NextResponse.json({
      success: true,
      message: `Monthly closing completed for ${year}-${String(month).padStart(2, '0')}`,
      device_id: deviceId,
      summary: {
        year_month: `${year}-${String(month).padStart(2, '0')}`,
        total_energy_kwh: parseFloat(monthlyData.total_energy_generated) || 0,
        total_carbon_kg: parseFloat(monthlyData.total_carbon_reduction) || 0,
        days_operated: monthlyData.days_operated || 0,
        avg_battery_capacity: parseFloat(monthlyData.avg_battery_capacity) || 0,
        peak_power_w: parseFloat(monthlyData.max_pv1_charging_power) || 0
      }
    });

  } catch (error: any) {
    console.error('Error in monthly closing:', error.message);
    return NextResponse.json(
      { error: 'Monthly closing failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Check closing status or find missing months
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';
  const action = searchParams.get('action');

  try {
    // Find missing months for closing
    if (action === 'close-missing') {
      const targetYear = year || new Date().getFullYear();

      const missingMonths = await db.query<any[]>(
        `SELECT DISTINCT
          YEAR(timestamp) as year,
          MONTH(timestamp) as month
        FROM raw_inverter_data r
        WHERE r.device_id = ?
          AND YEAR(r.timestamp) = ?
          AND NOT EXISTS (
            SELECT 1 FROM monthly_inverter_stats m
            WHERE m.device_id = r.device_id
              AND m.year = YEAR(r.timestamp)
              AND m.month = MONTH(r.timestamp)
          )
        ORDER BY month`,
        [deviceId, targetYear]
      );

      const months = missingMonths.map(row => ({
        year: row.year,
        month: row.month,
        display: `${row.year}-${String(row.month).padStart(2, '0')}`
      }));

      return NextResponse.json({
        device_id: deviceId,
        year: targetYear,
        missing_months: months,
        count: months.length,
        message: `Found ${months.length} months requiring closing in ${targetYear}`
      });
    }

    // Check specific month status
    if (year && month) {
      const closingStatus = await db.query<any[]>(
        `SELECT * FROM monthly_inverter_stats
         WHERE device_id = ? AND year = ? AND month = ?`,
        [deviceId, year, month]
      );

      const hasClosed = closingStatus.length > 0;
      const closedData = hasClosed ? closingStatus[0] : null;

      return NextResponse.json({
        device_id: deviceId,
        year_month: `${year}-${String(month).padStart(2, '0')}`,
        is_closed: hasClosed,
        closed_data: closedData,
        message: hasClosed
          ? `Monthly closing completed for ${year}-${String(month).padStart(2, '0')}`
          : `No closing record found for ${year}-${String(month).padStart(2, '0')}`
      });
    }

    // Return recent monthly closings
    const recentClosings = await db.query<any[]>(
      `SELECT year, month, total_energy_generated, total_carbon_reduction,
              days_operated, created_at, updated_at
       FROM monthly_inverter_stats
       WHERE device_id = ?
       ORDER BY year DESC, month DESC
       LIMIT 12`,
      [deviceId]
    );

    return NextResponse.json({
      device_id: deviceId,
      recent_closings: recentClosings,
      count: recentClosings.length
    });

  } catch (error: any) {
    console.error('Error checking monthly closing status:', error.message);
    return NextResponse.json(
      { error: 'Failed to check monthly closing status', details: error.message },
      { status: 500 }
    );
  }
}
