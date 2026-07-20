import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkDeviceAccess } from '@/lib/auth';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';
  const year = searchParams.get('year');
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // YYYY-MM format

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

    // If year is provided, get monthly aggregated data for the whole year
    if (year) {
      // First try to get data from monthly_inverter_stats table
      let rows = await db.query<any[]>(
        `SELECT
          CONCAT(year, '-', LPAD(month, 2, '0')) as month,
          total_energy_generated as total_solar_kwh,
          total_carbon_reduction as carbon_reduction,
          avg_battery_capacity,
          days_operated as days_with_data,
          total_energy_generated / NULLIF(days_operated, 0) as avg_daily_generation,
          total_energy_generated as peak_generation_kwh,
          total_energy_generated * 150 as cost_savings
        FROM monthly_inverter_stats
        WHERE device_id = ?
          AND year = ?
        ORDER BY month`,
        [deviceId, year]
      );

      // If no data in monthly_inverter_stats, try monthly_energy_reports
      if (!rows || rows.length === 0) {
        rows = await db.query<any[]>(
          `SELECT
            \`year_month\` as month,
            \`total_solar_kwh\`,
            \`total_carbon_reduction\` as carbon_reduction,
            \`avg_battery_efficiency\` as avg_battery_capacity,
            \`avg_daily_generation\`,
            \`peak_generation_kwh\`,
            \`cost_savings\`
          FROM \`monthly_energy_reports\`
          WHERE \`device_id\` = ?
            AND \`year_month\` LIKE ?
          ORDER BY \`year_month\``,
          [deviceId, `${year}-%`]
        );
      }

      // If still no data, try daily_inverter_stats
      if (!rows || rows.length === 0) {
        rows = await db.query<any[]>(
          `SELECT
            DATE_FORMAT(date, '%Y-%m') as month,
            MONTHNAME(date) as month_name,
            SUM(total_energy_generated) as total_solar_kwh,
            SUM(total_carbon_reduction) as carbon_reduction,
            AVG(avg_battery_capacity) as avg_battery_capacity,
            COUNT(DISTINCT date) as days_with_data
          FROM daily_inverter_stats
          WHERE device_id = ?
            AND YEAR(date) = ?
          GROUP BY DATE_FORMAT(date, '%Y-%m'), MONTHNAME(date)
          ORDER BY month`,
          [deviceId, year]
        );
      }

      // If still no data, fallback to raw_inverter_data with correct calculation
      if (!rows || rows.length === 0) {
        rows = await db.query<any[]>(
          `SELECT
            DATE_FORMAT(timestamp, '%Y-%m') as month,
            MONTHNAME(timestamp) as month_name,
            -- Correct calculation: power * time (each record is 30 seconds = 1/120 hour)
            SUM(pv1_charging_power / 1000 * ?) as total_solar_kwh,
            SUM(pv1_charging_power / 1000 * ? * ?) as carbon_reduction,
            AVG(battery_capacity) as avg_battery_capacity,
            MAX(pv1_charging_power) as peak_power,
            COUNT(DISTINCT DATE(timestamp)) as days_with_data
          FROM raw_inverter_data
          WHERE device_id = ?
            AND YEAR(timestamp) = ?
          GROUP BY DATE_FORMAT(timestamp, '%Y-%m'), MONTHNAME(timestamp)
          ORDER BY month`,
          [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, year]
        );
      }

      // Fill in missing months with zero data
      const monthlyData = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = 0; i < 12; i++) {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
        const existingData = rows.find(row => row.month === monthStr);

        if (existingData) {
          monthlyData.push({
            ...existingData,
            month_name: months[i],
            total_solar_kwh: parseFloat(existingData.total_solar_kwh) || 0,
            carbon_reduction: parseFloat(existingData.carbon_reduction) || 0,
            avg_battery_capacity: parseFloat(existingData.avg_battery_capacity) || 0,
            avg_daily_generation: parseFloat(existingData.avg_daily_generation) || 0,
            peak_generation_kwh: parseFloat(existingData.peak_generation_kwh) || 0,
            cost_savings: parseFloat(existingData.cost_savings) || 0
          });
        } else {
          // Add zero data for months without data
          monthlyData.push({
            month: monthStr,
            month_name: months[i],
            total_solar_kwh: 0,
            carbon_reduction: 0,
            avg_battery_capacity: 0,
            avg_daily_generation: 0,
            peak_generation_kwh: 0,
            cost_savings: 0
          });
        }
      }

      return NextResponse.json({
        device_id: deviceId,
        year: year,
        monthly_data: monthlyData
      });
    } else {
      // Original logic for single month
      const yearFromMonth = month.split('-')[0];
      const monthNum = month.split('-')[1];
      const startDate = `${yearFromMonth}-${monthNum}-01`;
      const endDate = new Date(parseInt(yearFromMonth), parseInt(monthNum), 0).toISOString().slice(0, 10); // Last day of month

      // Get daily aggregated data for the month
      const rows = await db.query<any[]>(
        `SELECT
          DATE(timestamp) as date,
          -- Correct calculation: power * time (each record is 30 seconds = 1/120 hour)
          SUM(pv1_charging_power / 1000 * ?) as total_solar_kwh,
          SUM(pv1_charging_power / 1000 * ? * ?) as carbon_reduction,
          AVG(battery_capacity) as avg_battery_capacity,
          MAX(pv1_charging_power) as peak_power,
          COUNT(*) as records_count
        FROM raw_inverter_data
        WHERE device_id = ?
          AND DATE(timestamp) BETWEEN ? AND ?
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp)`,
        [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, startDate, endDate]
      );

      return NextResponse.json({
        device_id: deviceId,
        month: month,
        daily_data: rows
      });
    }

  } catch (error: any) {
    console.error('Database error in monthly report:', error.message);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
