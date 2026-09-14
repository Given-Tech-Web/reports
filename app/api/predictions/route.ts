import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing parameters (start, end)' }, { status: 400 });
    }

    const startTime = `${start} 00:00:00`;
    const endTime = `${end} 23:59:59`;

    const rows = await db.query(
    `WITH RankedPredictions AS (
        SELECT 
        student_name, 
        model_name, 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as reg_time,
        DATE_FORMAT(target_time, '%Y-%m-%d %H:%i') as time,
        predicted_value as value,
        ROW_NUMBER() OVER(
            PARTITION BY student_name, model_name, created_at, target_time 
            ORDER BY created_at DESC
        ) as rn
        FROM solar_predictions
        WHERE target_time BETWEEN ? AND ?
    )
    SELECT student_name, model_name, reg_time, time, value
    FROM RankedPredictions
    WHERE rn = 1
    ORDER BY time ASC`,
    [startTime, endTime]
    );

    const grouped = (rows as any[] || []).reduce((acc: any, row: any) => {
    // 키 값에 시분초가 포함된 reg_time을 사용합니다.
    const key = `\({row.student_name}_\){row.model_name}_${row.reg_time}`;
    if (!acc[key]) {
        acc[key] = {
        id: key,
        student_name: row.student_name,
        model_name: row.model_name,
        reg_time: row.reg_time, 
        prediction_data: []
        };
    }
    acc[key].prediction_data.push({ time: row.time, value: row.value });
    return acc;
    }, {});

    return NextResponse.json(Object.values(grouped));
  } catch (error: any) {
    console.error('Fetch predictions error:', error.message);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { studentName, modelName, predictionData } = await request.json();
    if (!studentName || !modelName || !predictionData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedData = typeof predictionData === 'string' ? JSON.parse(predictionData) : predictionData;

    // 데이터베이스에 개별 데이터 레코드 순차 삽입
    for (const data of parsedData) {
      await db.query(
        `INSERT INTO solar_predictions (student_name, model_name, target_time, predicted_value) 
         VALUES (?, ?, ?, ?)`,
        [studentName, modelName, data.time, data.value]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save predictions error:', error.message);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}