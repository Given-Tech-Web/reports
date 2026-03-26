import { NextRequest, NextResponse } from 'next/server';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

// POST: Execute yearly closing for a specific year
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, deviceId = 'solar_system_001' } = body;

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Starting yearly closing for ${year}, device: ${deviceId}`);

    // Create yearly_inverter_stats table if not exists
    await db.query(
      `CREATE TABLE IF NOT EXISTS yearly_inverter_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(50) NOT NULL,
        year INT NOT NULL,
        total_energy_generated DECIMAL(14,4),
        total_carbon_reduction DECIMAL(14,4),
        avg_battery_capacity DECIMAL(5,2),
        max_pv1_charging_power DECIMAL(10,2),
        avg_load_percentage DECIMAL(5,2),
        months_operated INT,
        days_operated INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_device_year (device_id, year),
        INDEX idx_device_id (device_id),
        INDEX idx_year (year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // First check if monthly_inverter_stats has data for this year
    const monthlyStats = await db.query<any[]>(
      `SELECT
        COUNT(*) as months_with_data,
        SUM(total_energy_generated) as total_energy,
        SUM(total_carbon_reduction) as total_carbon,
        AVG(avg_battery_capacity) as avg_battery,
        MAX(max_pv1_charging_power) as max_power,
        AVG(avg_load_percentage) as avg_load,
        SUM(days_operated) as total_days
      FROM monthly_inverter_stats
      WHERE device_id = ? AND year = ?`,
      [deviceId, year]
    );

    const monthlyData = monthlyStats[0];

    // If monthly stats exist, use them; otherwise aggregate from daily or raw data
    let yearlyData;
    if (monthlyData && monthlyData.months_with_data > 0) {
      yearlyData = {
        device_id: deviceId,
        year: year,
        total_energy_generated: monthlyData.total_energy,
        total_carbon_reduction: monthlyData.total_carbon,
        avg_battery_capacity: monthlyData.avg_battery,
        max_pv1_charging_power: monthlyData.max_power,
        avg_load_percentage: monthlyData.avg_load,
        months_operated: monthlyData.months_with_data,
        days_operated: monthlyData.total_days
      };
    } else {
      // Try aggregating from daily_inverter_stats
      const dailyStats = await db.query<any[]>(
        `SELECT
          COUNT(*) as days_with_data,
          SUM(total_energy_generated) as total_energy,
          SUM(total_carbon_reduction) as total_carbon,
          AVG(avg_battery_capacity) as avg_battery,
          MAX(max_pv1_charging_power) as max_power,
          AVG(avg_load_percentage) as avg_load,
          COUNT(DISTINCT MONTH(date)) as months_operated
        FROM daily_inverter_stats
        WHERE device_id = ? AND YEAR(date) = ?`,
        [deviceId, year]
      );

      const dailyData = dailyStats[0];

      if (dailyData && dailyData.days_with_data > 0) {
        yearlyData = {
          device_id: deviceId,
          year: year,
          total_energy_generated: dailyData.total_energy,
          total_carbon_reduction: dailyData.total_carbon,
          avg_battery_capacity: dailyData.avg_battery,
          max_pv1_charging_power: dailyData.max_power,
          avg_load_percentage: dailyData.avg_load,
          months_operated: dailyData.months_operated,
          days_operated: dailyData.days_with_data
        };
      } else {
        // Last resort: aggregate from raw_inverter_data
        const rawStats = await db.query<any[]>(
          `SELECT
            ? as device_id,
            ? as year,
            SUM(pv1_charging_power / 1000 * ?) as total_energy_generated,
            SUM(pv1_charging_power / 1000 * ? * ?) as total_carbon_reduction,
            AVG(battery_capacity) as avg_battery_capacity,
            MAX(pv1_charging_power) as max_pv1_charging_power,
            AVG(load_percentage) as avg_load_percentage,
            COUNT(DISTINCT MONTH(timestamp)) as months_operated,
            COUNT(DISTINCT DATE(timestamp)) as days_operated
          FROM raw_inverter_data
          WHERE device_id = ? AND YEAR(timestamp) = ?`,
          [deviceId, year, DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, year]
        );

        yearlyData = rawStats[0];
      }
    }

    // Check if there's data to process
    if (!yearlyData || !yearlyData.days_operated) {
      return NextResponse.json({
        success: false,
        message: `No data found for year ${year}`,
        device_id: deviceId
      });
    }

    // Insert or update yearly_inverter_stats
    await db.query(
      `INSERT INTO yearly_inverter_stats (
        device_id, year,
        total_energy_generated,
        total_carbon_reduction,
        avg_battery_capacity,
        max_pv1_charging_power,
        avg_load_percentage,
        months_operated,
        days_operated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_energy_generated = VALUES(total_energy_generated),
        total_carbon_reduction = VALUES(total_carbon_reduction),
        avg_battery_capacity = VALUES(avg_battery_capacity),
        max_pv1_charging_power = VALUES(max_pv1_charging_power),
        avg_load_percentage = VALUES(avg_load_percentage),
        months_operated = VALUES(months_operated),
        days_operated = VALUES(days_operated),
        updated_at = CURRENT_TIMESTAMP`,
      [
        yearlyData.device_id,
        yearlyData.year,
        yearlyData.total_energy_generated || 0,
        yearlyData.total_carbon_reduction || 0,
        yearlyData.avg_battery_capacity || 0,
        yearlyData.max_pv1_charging_power || 0,
        yearlyData.avg_load_percentage || 0,
        yearlyData.months_operated || 0,
        yearlyData.days_operated || 0
      ]
    );

    console.log(`Yearly closing completed for ${year}`);

    return NextResponse.json({
      success: true,
      message: `Yearly closing completed for ${year}`,
      device_id: deviceId,
      summary: {
        year: year,
        total_energy_kwh: parseFloat(yearlyData.total_energy_generated) || 0,
        total_carbon_kg: parseFloat(yearlyData.total_carbon_reduction) || 0,
        months_operated: yearlyData.months_operated || 0,
        days_operated: yearlyData.days_operated || 0,
        avg_battery_capacity: parseFloat(yearlyData.avg_battery_capacity) || 0,
        peak_power_w: parseFloat(yearlyData.max_pv1_charging_power) || 0
      }
    });

  } catch (error: any) {
    console.error('Error in yearly closing:', error.message);
    return NextResponse.json(
      { error: 'Yearly closing failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Check closing status or find missing years
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';
  const action = searchParams.get('action');

  try {
    // Find missing years for closing
    if (action === 'close-missing') {
      const missingYears = await db.query<any[]>(
        `SELECT DISTINCT YEAR(timestamp) as year
        FROM raw_inverter_data r
        WHERE r.device_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM yearly_inverter_stats y
            WHERE y.device_id = r.device_id
              AND y.year = YEAR(r.timestamp)
          )
        ORDER BY year DESC`,
        [deviceId]
      );

      const years = missingYears.map(row => row.year);

      return NextResponse.json({
        device_id: deviceId,
        missing_years: years,
        count: years.length,
        message: `Found ${years.length} years requiring closing`
      });
    }

    // Check specific year status
    if (year) {
      const closingStatus = await db.query<any[]>(
        `SELECT * FROM yearly_inverter_stats
         WHERE device_id = ? AND year = ?`,
        [deviceId, year]
      );

      const hasClosed = closingStatus.length > 0;
      const closedData = hasClosed ? closingStatus[0] : null;

      return NextResponse.json({
        device_id: deviceId,
        year: year,
        is_closed: hasClosed,
        closed_data: closedData,
        message: hasClosed
          ? `Yearly closing completed for ${year}`
          : `No closing record found for ${year}`
      });
    }

    // Return all yearly closings
    const recentClosings = await db.query<any[]>(
      `SELECT year, total_energy_generated, total_carbon_reduction,
              months_operated, days_operated, created_at, updated_at
       FROM yearly_inverter_stats
       WHERE device_id = ?
       ORDER BY year DESC`,
      [deviceId]
    );

    return NextResponse.json({
      device_id: deviceId,
      yearly_closings: recentClosings,
      count: recentClosings.length
    });

  } catch (error: any) {
    console.error('Error checking yearly closing status:', error.message);
    return NextResponse.json(
      { error: 'Failed to check yearly closing status', details: error.message },
      { status: 500 }
    );
  }
}
