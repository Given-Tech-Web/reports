import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkDeviceAccess } from '@/lib/auth';
import { db } from '@/lib/database';

// 🛠️ 도우미 함수: '시간(Hour)' 단위 타임라인 생성
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

export async function GET(request: NextRequest) {
  try {
    // 1. 세션 및 권한 체크 (고객님 프로젝트 규격 적용)
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'solar_system_001';
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const hasAccess = await checkDeviceAccess(Number(session.id), deviceId);
    if (!hasAccess) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 2. 쿼리용 날짜 세팅 및 타임라인 생성
    const startTime = `${start} 00:00:00`;
    const endTime = `${end} 23:59:59`;
    const timeline = generateHourlyTimeline(start, end);
      
    // 3. 고객님의 원본 대시보드 SQL 쿼리
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

    // 🌟 4. 고객님의 커스텀 db.query 규격으로 변경 (배열 분해 할당 제거)
    const rows = await db.query<any[]>(query, [deviceId, startTime, endTime]);

    // 5. 조회된 데이터를 Map 객체에 담기
    const dataMap = new Map();
    if (rows && rows.length > 0) {
      rows.forEach((row) => {
        dataMap.set(row.date, row);
      });
    }

    // 6. 타임라인(24시간)을 순회하며 데이터가 없는 시간대는 0으로 채움
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

  } catch (error: any) {
    console.error('Database error in history report:', error.message);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}