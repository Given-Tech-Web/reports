import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  
    const baseUrl = process.env.MARIADB_HOST || '127.0.0.1';
  
  try {
    // 💡 핵심 수정: 버그가 있는 /inverter_app 대신, device_id를 잘 전달하는 /generator_auto_pi를 우회 사용!
    const pythonUrl = `http://${baseUrl}:8293/generator_auto_pi?device_id=${deviceId}&command=QPIGS`;
    
    // 개발 테스트를 위해 VSCode 터미널에 요청 주소를 찍어봅니다.
    console.log("[Status API] Fetching from:", pythonUrl);

    const response = await fetch(pythonUrl);
    const data = await response.json();
    
    // 파이썬이 보내준 진짜 원본 데이터를 터미널에 출력해봅니다.
    console.log("[Status API] Received Data:", data); 

    // 정상적으로 배열이 넘어오고, AC 전압(인덱스 3) 값이 존재한다면
    if (Array.isArray(data) && data.length > 3) {
      const acVoltage = Number(data[3]);
      const status = acVoltage >= 100 ? 'running' : 'stopped';
      
      return NextResponse.json({ status, acVoltage });
    }
    
    // DB에 데이터가 아예 없는 경우 (null)
    return NextResponse.json({ status: 'stopped', acVoltage: 0, notice: "No data in DB" });
    
  } catch (error) {
    console.error("[Status API] Error:", error);
    return NextResponse.json({ status: 'unknown', acVoltage: 0 }, { status: 500 });
  }
}