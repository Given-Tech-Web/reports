import { NextResponse } from 'next/server';
import pool from '@/lib/db'; 

// 🛠️ 도우미 함수: 조회 기간 전체를 '1시간 단위' 빈 타임라인으로 생성합니다. (1년이든 7일이든 동일)
function generateHourlyTimeline(startStr: string, endStr: string) {
  const timeline = [];
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T23:59:59`);

  let current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const hh = String(current.getHours()).padStart(2, '0');
    
    timeline.push(`${yyyy}-${mm}-${dd} ${hh}:00`);
    current.setHours(current.getHours() + 1);
  }
  return timeline;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!deviceId || !start || !end) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 💡 타임존 시차 버그 방지: DB 드라이버가 오해하지 않도록 정확한 문자열로 박아 넣습니다.
    const startTime = `${start} 00:00:00`;
    const endTime = `${end} 23:59:59`;

    // 1. 기간에 상관없이 시작~종료일까지 1시간 단위 타임라인 생성
    const timeline = generateHourlyTimeline(start, end);
      
    // 🌟 2. 조건부 렌더링 삭제! 대시보드의 원본 SQL 1개로 통일 🌟
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

    const dataMap = new Map();
    (rows as any[]).forEach((row) => {
      dataMap.set(row.date, row);
    });

    // 3. DB 데이터와 타임라인을 병합 (빈 시간은 0으로 채움)
    const filledData = timeline.map(timeStr => {
      if (dataMap.has(timeStr)) {
        return {
          date: timeStr,
          solar: Number(dataMap.get(timeStr).solar) || 0,
          battery: Number(dataMap.get(timeStr).battery) || 0
        };
      } else {
        return {
          date: timeStr,
          solar: 0,
          battery: 0
        };
      }
    });

    return NextResponse.json(filledData);

  } catch (error) {
    console.error('History API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}