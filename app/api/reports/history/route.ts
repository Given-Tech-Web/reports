import { NextRequest, NextResponse } from 'next/server';
import { getSession, checkDeviceAccess } from '@/lib/auth';
// 💡 고객님의 코드처럼 상수를 같이 불러옵니다!
import { db, CARBON_FACTOR, DATA_INTERVAL } from '@/lib/database';

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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'solar_system_001';
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const hasAccess = await checkDeviceAccess(Number(session.id), deviceId);
    if (!hasAccess) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });

    const startTime = `${start} 00:00:00`;
    const endTime = `${end} 23:59:59`;
    const timeline = generateHourlyTimeline(start, end);
      
    // 1. 차트용 데이터 쿼리 (원본 그대로)
    const chartQuery = `
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

    const chartRows = await db.query<any[]>(chartQuery, [deviceId, startTime, endTime]);

    const dataMap = new Map();
    if (chartRows && chartRows.length > 0) {
      chartRows.forEach((row) => dataMap.set(row.date, row));
    }

    const filledData = timeline.map(timeStr => ({
      date: timeStr,
      solar: Number(dataMap.get(timeStr)?.solar) || 0,
      battery: Number(dataMap.get(timeStr)?.battery) || 0
    }));

    // 🌟 2. 고객님이 보여주신 공식을 적용한 Summary(요약) 쿼리 추가 🌟
    const summaryRows = await db.query<any[]>(
      `SELECT
        SUM(pv1_charging_power / 1000 * ?) as total_energy_kwh,
        SUM(pv1_charging_power / 1000 * ? * ?) as total_carbon_kg
       FROM raw_inverter_data
       WHERE device_id = ? AND timestamp BETWEEN ? AND ?`,
      [DATA_INTERVAL, DATA_INTERVAL, CARBON_FACTOR, deviceId, startTime, endTime]
    );

    const summaryData = summaryRows && summaryRows.length > 0 ? summaryRows[0] : null;
    const totalEnergy = parseFloat(summaryData?.total_energy_kwh) || 0;
    const totalCarbon = parseFloat(summaryData?.total_carbon_kg) || 0;

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const diffDays = Math.max(1, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));

    // 3. 차트 데이터와 정확한 요약 데이터를 함께 리턴
    return NextResponse.json({
      chartData: filledData,
      summary: {
        total_energy_kwh: totalEnergy,
        total_carbon_kg: totalCarbon,
        avg_daily_solar: totalEnergy / diffDays,
        avg_daily_carbon: totalCarbon / diffDays,
        
        // 환경 지표 환산 (기존 대시보드 공식)
        trees_planted: Math.floor(totalCarbon / 21.5),
        households_powered: (totalEnergy / 23.04).toFixed(1),
        cars_off_road: (totalCarbon / 5016).toFixed(3),
        coal_not_burned: (totalEnergy * 0.536).toFixed(1)
      }
    });

  } catch (error: any) {
    console.error('Database error in history report:', error.message);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
}