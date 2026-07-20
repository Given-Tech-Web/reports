import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkDeviceAccess } from '@/lib/auth';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

interface YearlyData {
  year: number;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
  records_count: number;
}

interface ComprehensiveTotal {
  first_record_date: Date | null;
  last_record_date: Date | null;
  total_solar_kwh: number;
  total_carbon_reduction: number;
  total_records: number;
  peak_power_ever: number;
}

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

    const hasAccess = await checkDeviceAccess(Number(session.id), deviceId);
    if (!hasAccess) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // First try to get data from monthly_inverter_stats (monthly closings)
    let yearlyRows = await db.query<any[]>(
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
      ORDER BY year`,
      [deviceId]
    );

    // If no data in monthly_inverter_stats, try daily_inverter_stats
    if (!yearlyRows || yearlyRows.length === 0) {
      yearlyRows = await db.query<any[]>(
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
        ORDER BY YEAR(date)`,
        [deviceId]
      );
    }

    // If still no data, fallback to raw_inverter_data
    if (!yearlyRows || yearlyRows.length === 0) {
      yearlyRows = await db.query<any[]>(
        `SELECT
          YEAR(timestamp) as year,
          SUM(pv1_charging_power / 1000 * ?) as total_solar_kwh,
          SUM(pv1_charging_power / 1000 * ? * ?) as carbon_reduction,
          AVG(battery_capacity) as avg_battery_capacity,
          MAX(pv1_charging_power) as peak_power,
          COUNT(*) as records_count
        FROM raw_inverter_data
        WHERE device_id = ?
        GROUP BY YEAR(timestamp)
        ORDER BY YEAR(timestamp)`,
        [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId]
      );
    }

    // Get overall totals from the same source
    const yearlyData = yearlyRows as YearlyData[];
    const totals: ComprehensiveTotal = {
      first_record_date: null,
      last_record_date: null,
      total_solar_kwh: 0,
      total_carbon_reduction: 0,
      total_records: 0,
      peak_power_ever: 0
    };

    if (yearlyData.length > 0) {
      totals.total_solar_kwh = yearlyData.reduce((sum, row) => sum + parseFloat(row.total_solar_kwh?.toString() || '0'), 0);
      totals.total_carbon_reduction = yearlyData.reduce((sum, row) => sum + parseFloat(row.carbon_reduction?.toString() || '0'), 0);
      totals.total_records = yearlyData.reduce((sum, row) => sum + (row.records_count || 0), 0);
      totals.peak_power_ever = Math.max(...yearlyData.map(row => row.peak_power || 0));

      // Get date range
      const dateRows = await db.query<any[]>(
        `SELECT MIN(DATE(timestamp)) as first_date, MAX(DATE(timestamp)) as last_date
         FROM raw_inverter_data WHERE device_id = ?`,
        [deviceId]
      );

      if (dateRows && dateRows.length > 0) {
        const dateData = dateRows[0];
        totals.first_record_date = dateData.first_date;
        totals.last_record_date = dateData.last_date;
      }
    }

    // Process and format the response
    const response = {
      device_id: deviceId,
      yearly_data: yearlyData.map(row => ({
        year: row.year,
        total_solar_kwh: parseFloat(row.total_solar_kwh?.toString() || '0'),
        carbon_reduction: parseFloat(row.carbon_reduction?.toString() || '0'),
        avg_battery_capacity: parseFloat(row.avg_battery_capacity?.toString() || '0'),
        peak_power: row.peak_power || 0,
        records_count: row.records_count || 0
      })),
      totals: totals
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Database error in comprehensive report:', error.message);
    return NextResponse.json(
      {
        error: 'Database query failed',
        device_id: deviceId
      },
      { status: 500 }
    );
  }
}
