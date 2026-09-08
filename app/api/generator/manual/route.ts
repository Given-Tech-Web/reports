import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 프론트엔드에서 보낸 deviceId를 동적으로 받습니다.
    const { deviceId, action } = await request.json();
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID가 선택되지 않았습니다.' }, { status: 400 });
    }

    // ENV 파일에서 미들웨어 IP를 가져옵니다. (없으면 127.0.0.1을 기본값으로 사용)
    const baseUrl = process.env.MARIADB_HOST || '127.0.0.1';
    
    const pythonUrl = `http://${baseUrl}:8293/generator_manual?device_id=${deviceId}&command=${action}`;
    
    const response = await fetch(pythonUrl);
    const data = await response.text();

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Manual control error:', error);
    return NextResponse.json({ error: '수동 제어 명령 전송에 실패했습니다.' }, { status: 500 });
  }
}