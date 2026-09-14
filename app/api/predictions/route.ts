import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/database';

// [조회] 기간별 예측 모델 데이터 조회 (GET /api/predictions?start=YYYY-MM-DD&end=YYYY-MM-DD)
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

    // 선택한 기간(start ~ end)에 해당하는 예측 데이터만 Ranked 쿼리로 최신값만 조회
    const rows = await db.query(
      `WITH RankedPredictions AS (
         SELECT 
           student_name, 
           model_name, 
           DATE_FORMAT(target_time, '%Y-%m-%d %H:%i') as time,
           predicted_value as value,
           ROW_NUMBER() OVER(
             PARTITION BY student_name, model_name, target_time 
             ORDER BY created_at DESC
           ) as rn
         FROM solar_predictions
         WHERE target_time BETWEEN ? AND ?
       )
       SELECT student_name, model_name, time, value
       FROM RankedPredictions
       WHERE rn = 1
       ORDER BY time ASC`,
      [startTime, endTime]
    );

    // 프론트엔드 차트가 그리기 쉽게 학생+모델별로 그룹화
    const grouped = (rows || []).reduce((acc: any, row: any) => {
      const key = `\({row.student_name}_\){row.model_name}`;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          student_name: row.student_name,
          model_name: row.model_name,
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

// [저장] 예측 모델 데이터 등록 (POST /api/predictions)
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