import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });

    const baseUrl = process.env.MARIADB_HOST || '127.0.0.1';
  
  try {
    // manageData.py의 _select_latest_inverter를 호출하여 최신 상태를 가져옵니다.
    const response = await fetch(`http://${baseUrl}:8293/inverter_app?device_id=${deviceId}&command=QPIGS`);
    const data = await response.json();
    
    // 리턴 데이터 구조: [id, timestamp, device_id, ac_voltage, ...]
    // 4번째 값(인덱스 3)이 ac_voltage 입니다. 100V 이상이면 가동 중으로 판단.
    if (Array.isArray(data) && data.length > 3) {
      const acVoltage = Number(data[3]);
      const status = acVoltage >= 100 ? 'running' : 'stopped';
      return NextResponse.json({ status, acVoltage });
    }
    return NextResponse.json({ status: 'unknown', acVoltage: 0 });
  } catch (error) {
    return NextResponse.json({ status: 'unknown', acVoltage: 0 }, { status: 500 });
  }
}