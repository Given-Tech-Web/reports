import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkDeviceAccess } from '@/lib/auth';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

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

    // First try daily_inverter_stats table for better performance
    let rows = await db.query<any[]>(
      `SELECT
        date,
        total_energy_generated as total_solar_kwh,
        total_carbon_reduction as carbon_reduction,
        avg_battery_capacity,
        max_pv1_charging_power as peak_power,
        avg_load_percentage as avg_load_percent,
        1 as records_count
      FROM daily_inverter_stats
      WHERE device_id = ?
        AND date BETWEEN ? AND ?
      ORDER BY date`,
      [deviceId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    // If no data in daily stats, fallback to raw_inverter_data
    if (!rows || rows.length === 0) {
      rows = await db.query<any[]>(
        `SELECT
          DATE(timestamp) as date,
          -- Correct calculation: power * time (each record is 30 seconds = 1/120 hour)
          SUM(pv1_charging_power / 1000 * ?) as total_solar_kwh,
          SUM(pv1_charging_power / 1000 * ? * ?) as carbon_reduction,
          AVG(battery_capacity) as avg_battery_capacity,
          MAX(pv1_charging_power) as peak_power,
          AVG(load_percentage) as avg_load_percent,
          COUNT(*) as records_count
        FROM raw_inverter_data
        WHERE device_id = ?
          AND DATE(timestamp) BETWEEN ? AND ?
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp)`,
        [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );
    }

    // Convert string values to numbers for proper chart display
    const formattedRows = rows.map(row => ({
      ...row,
      total_kwh: parseFloat(row.total_kwh || row.total_solar_kwh) || 0,
      carbon_reduction: parseFloat(row.carbon_reduction) || 0,
      avg_battery_capacity: parseFloat(row.avg_battery_capacity) || 0,
      peak_power: parseFloat(row.peak_power) || 0,
      avg_load_percent: parseFloat(row.avg_load_percent) || 0
    }));

    return NextResponse.json({
      device_id: deviceId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      daily_data: formattedRows
    });

  } catch (error: any) {
    console.error('Database error in weekly report:', error.message);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
