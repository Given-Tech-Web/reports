import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });

    const baseUrl = process.env.MARIADB_HOST || '127.0.0.1';
  
  try {
    // manageData.py의 _select_auto_config 로직을 타게 됩니다.
    const response = await fetch(`http://${baseUrl}:8293/generator_auto_pi?device_id=${deviceId}&command=auto`);
    const data = await response.json(); 
    
    // 파이썬 배열 [start, stop] 형태로 리턴됨
    if (Array.isArray(data) && data.length >= 2) {
      return NextResponse.json({ startCapacity: data[0], stopCapacity: data[1] });
    }
    return NextResponse.json({ startCapacity: 30, stopCapacity: 80 }); // DB에 없을 시 기본값
  } catch (error) {
    return NextResponse.json({ startCapacity: 30, stopCapacity: 80 }, { status: 500 });
  }
}