import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = process.env.MARIADB_HOST || '127.0.0.1';

    const res = await fetch(`http://${baseUrl}:8293/api/predictions`);
    if (!res.ok) throw new Error('미들서버 조회 실패');
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const baseUrl = process.env.MARIADB_HOST || '127.0.0.1';
    
    const res = await fetch(`http://${baseUrl}:8293/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error('미들서버 저장 실패');

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}