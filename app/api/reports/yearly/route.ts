import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkDeviceAccess } from '@/lib/auth';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';

  try {

    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const hasAccess = await checkDeviceAccess(session.id, deviceId);
    if (!hasAccess) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // First try to get data from monthly_inverter_stats (monthly closings)
    let rows = await db.query<any[]>(
      `SELECT
        year,
        SUM(total_energy_generated) as total_solar_kwh,
        SUM(total_carbon_reduction) as carbon_reduction,
        AVG(avg_battery_capacity) as avg_battery_capacity,
        MAX(max_pv1_charging_power) as peak_power,
        SUM(days_operated) as records_count
      FROM monthly_inverter_stats
      WHERE device_id = ?
      GROUP BY year
      ORDER BY year DESC`,
      [deviceId]
    );

    // If no data in monthly_inverter_stats, try daily_inverter_stats
    if (!rows || rows.length === 0) {
      rows = await db.query<any[]>(
        `SELECT
          YEAR(date) as year,
          SUM(total_energy_generated) as total_solar_kwh,
          SUM(total_carbon_reduction) as carbon_reduction,
          AVG(avg_battery_capacity) as avg_battery_capacity,
          MAX(max_pv1_charging_power) as peak_power,
          COUNT(*) as records_count
        FROM daily_inverter_stats
        WHERE device_id = ?
        GROUP BY YEAR(date)
        ORDER BY YEAR(date) DESC`,
        [deviceId]
      );
    }

    // If still no data, fallback to raw_inverter_data
    if (!rows || rows.length === 0) {
      rows = await db.query<any[]>(
        `SELECT
          YEAR(timestamp) as year,
          -- Correct calculation: power * time (each record is 30 seconds = 1/120 hour)
          SUM(pv1_charging_power / 1000 * ?) as total_solar_kwh,
          SUM(pv1_charging_power / 1000 * ? * ?) as carbon_reduction,
          AVG(battery_capacity) as avg_battery_capacity,
          MAX(pv1_charging_power) as peak_power,
          COUNT(*) as records_count
        FROM raw_inverter_data
        WHERE device_id = ?
        GROUP BY YEAR(timestamp)
        ORDER BY YEAR(timestamp) DESC`,
        [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId]
      );
    }

    // Convert string values to numbers for proper chart display
    const formattedRows = rows.map(row => ({
      year: row.year,
      total_solar_kwh: parseFloat(row.total_solar_kwh) || 0,
      carbon_reduction: parseFloat(row.carbon_reduction) || 0,
      avg_battery_capacity: parseFloat(row.avg_battery_capacity) || 0,
      peak_power: parseFloat(row.peak_power) || 0,
      records_count: parseInt(row.records_count) || 0
    }));

    return NextResponse.json({
      device_id: deviceId,
      yearly_data: formattedRows
    });

  } catch (error: any) {
    console.error('Database error in yearly report:', error.message);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
