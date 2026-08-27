import { NextResponse } from 'next/server';
// 💡 프로젝트 환경에 맞게 DB 연결 모듈을 import 해주세요 (lib/db.ts 또는 lib/database.ts)
import pool from '@/lib/db'; 

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!deviceId || !start || !end) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const startTime = `${start} 00:00:00`;
    const endTime = `${end} 23:59:59`;

    // 💡 이전에 성공했던 1시간 단위 추출 쿼리입니다
    const query = `
      WITH RankedData AS (
          SELECT 
              DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') AS date_label,
              solar_kwh,
              battery_kwh,
              ROW_NUMBER() OVER(
                  PARTITION BY DATE_FORMAT(timestamp, '%Y-%m-%d %H') 
                  ORDER BY LEAST(MINUTE(timestamp), 60 - MINUTE(timestamp)) ASC
              ) as rn
          FROM raw_inverter_data
          WHERE device_id = ? AND timestamp BETWEEN ? AND ?
      )
      SELECT date_label as date, solar_kwh as solar, battery_kwh as battery
      FROM RankedData 
      WHERE rn = 1 
      ORDER BY date_label ASC;
    `;

    const [rows] = await pool.query(query, [deviceId, startTime, endTime]);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('History API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}