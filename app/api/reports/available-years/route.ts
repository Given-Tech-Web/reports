import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId') || 'solar_system_001';

  try {
    // First try to get years from daily_inverter_stats
    let rows = await db.query<any[]>(
      `SELECT
        YEAR(date) as year,
        COUNT(*) as record_count
      FROM daily_inverter_stats
      WHERE device_id = ?
        AND date IS NOT NULL
      GROUP BY YEAR(date)
      HAVING COUNT(*) > 0
      ORDER BY year DESC`,
      [deviceId]
    );

    // If no data in daily stats, try realtime_inverter_data
    if (!rows || rows.length === 0) {
      rows = await db.query<any[]>(
        `SELECT
          YEAR(timestamp) as year,
          COUNT(*) as record_count
        FROM realtime_inverter_data
        WHERE device_id = ?
          AND timestamp IS NOT NULL
        GROUP BY YEAR(timestamp)
        HAVING COUNT(*) > 0
        ORDER BY year DESC`,
        [deviceId]
      );
    }

    const years = rows
      .filter(row => row.year != null && row.record_count > 0)
      .map(row => row.year);

    // If no data found, only return current year
    if (years.length === 0) {
      const currentYear = new Date().getFullYear();
      years.push(currentYear);
    }

    return NextResponse.json({
      device_id: deviceId,
      years: years
    });

  } catch (error: any) {
    console.error('Database error in available years:', error.message);

    // Return default years on error
    const currentYear = new Date().getFullYear();
    return NextResponse.json({
      device_id: deviceId,
      years: [currentYear, currentYear - 1]
    });
  }
}
