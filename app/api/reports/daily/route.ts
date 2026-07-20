import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkDeviceAccess } from '@/lib/auth';
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';
  let date = searchParams.get('date');

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
    
    // If no date specified, get the most recent date with data
    if (!date) {
      const latestDateRows = await db.query<any[]>(
        `SELECT DATE(timestamp) as latest_date
         FROM raw_inverter_data
         WHERE device_id = ?
         ORDER BY timestamp DESC
         LIMIT 1`,
        [deviceId]
      );

      if (latestDateRows && latestDateRows.length > 0) {
        const latestDate = latestDateRows[0].latest_date;
        date = new Date(latestDate).toISOString().split('T')[0];
      } else {
        date = new Date().toISOString().split('T')[0];
      }
    }

    // Get hourly aggregated data from raw_inverter_data
    let hourlyRows = await db.query<any[]>(
      `SELECT
        HOUR(timestamp) as hour,
        MAX(timestamp) as timestamp,
        AVG(pv1_charging_power) as solar_power,
        AVG(battery_capacity) as battery_capacity,
        SUM(pv1_charging_power / 1000 * ?) as solar_kwh,
        SUM(pv1_charging_power / 1000 * ? * ?) as carbon_reduction,
        AVG(load_percentage) as load_percentage
      FROM raw_inverter_data
      WHERE device_id = ?
        AND DATE(timestamp) = ?
      GROUP BY HOUR(timestamp)
      ORDER BY hour`,
      [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, date]
    );

    // Convert string values to numbers
    hourlyRows = hourlyRows.map(row => ({
      ...row,
      solar_power: parseFloat(row.solar_power) || 0,
      battery_capacity: parseFloat(row.battery_capacity) || 0,
      solar_kwh: parseFloat(row.solar_kwh) || 0,
      carbon_reduction: parseFloat(row.carbon_reduction) || 0,
      load_percentage: parseFloat(row.load_percentage) || 0
    }));

    // Get summary - first try daily_inverter_stats
    let summaryRows = await db.query<any[]>(
      `SELECT
        1 as total_records,
        total_energy_generated as total_energy_kwh,
        avg_load_percentage as avg_load_percent,
        max_pv1_charging_power as peak_power_w,
        total_carbon_reduction as total_carbon_kg
      FROM daily_inverter_stats
      WHERE device_id = ?
        AND date = ?`,
      [deviceId, date]
    );

    // Fallback to raw_inverter_data
    if (!summaryRows || summaryRows.length === 0) {
      summaryRows = await db.query<any[]>(
        `SELECT
          COUNT(*) as total_records,
          SUM(pv1_charging_power / 1000 * ?) as total_energy_kwh,
          AVG(load_percentage) as avg_load_percent,
          MAX(pv1_charging_power) as peak_power_w,
          SUM(pv1_charging_power / 1000 * ? * ?) as total_carbon_kg
        FROM raw_inverter_data
        WHERE device_id = ?
          AND DATE(timestamp) = ?`,
        [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, date]
      );
    }

    // Get yesterday's data for comparison
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    let yesterdayRows = await db.query<any[]>(
      `SELECT
        HOUR(timestamp) as hour,
        MAX(timestamp) as timestamp,
        AVG(pv1_charging_power) as solar_power,
        SUM(pv1_charging_power / 1000 * ? * ?) as carbon_reduction
      FROM raw_inverter_data
      WHERE device_id = ?
        AND DATE(timestamp) = ?
      GROUP BY HOUR(timestamp)
      ORDER BY hour`,
      [DATA_INTERVAL, CARBON_FACTOR, deviceId, yesterdayDate]
    );

    yesterdayRows = yesterdayRows.map(row => ({
      ...row,
      solar_power: parseFloat(row.solar_power) || 0,
      carbon_reduction: parseFloat(row.carbon_reduction) || 0
    }));

    const summaryData = summaryRows.length > 0 ? summaryRows[0] : null;
    const summary = summaryData ? {
      total_records: Number(summaryData.total_records) || 0,
      total_energy_kwh: Number(summaryData.total_energy_kwh) || 0,
      avg_load_percent: Number(summaryData.avg_load_percent) || 0,
      peak_power_w: Number(summaryData.peak_power_w) || 0,
      total_carbon_kg: Number(summaryData.total_carbon_kg) || 0
    } : {
      total_records: 0,
      total_energy_kwh: 0,
      avg_load_percent: 0,
      peak_power_w: 0,
      total_carbon_kg: 0
    };

    return NextResponse.json({
      date: date,
      device_id: deviceId,
      hourly_data: hourlyRows,
      yesterday_hourly_data: yesterdayRows,
      summary: summary
    });

  } catch (error: any) {
    console.error('Database error in daily report:', error.message);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
