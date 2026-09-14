import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; 

// [조회] 여러 번 등록되었더라도 '같은 시간'에 대해 가장 최신에 등록된 데이터만 가져오기
export async function GET() {
  try {
    const [rows] = await pool.query(
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
       )
       SELECT student_name, model_name, time, value
       FROM RankedPredictions
       WHERE rn = 1
       ORDER BY time ASC`
    );

    // 차트가 그리기 쉽게 학생+모델별로 예쁘게 그룹화(Grouping) 합니다.
    const grouped = (rows as any[]).reduce((acc, row) => {
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
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

// [저장] 들어오는 족족 DB에 차곡차곡 쌓기 (단순 INSERT)
export async function POST(request: NextRequest) {
  try {
    const { studentName, modelName, predictionData } = await request.json();
    const parsedData = typeof predictionData === 'string' ? JSON.parse(predictionData) : predictionData;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 배열을 돌면서 무조건 한 줄씩 새로운 기록(Row)으로 남깁니다.
      for (const data of parsedData) {
        await connection.query(
          `INSERT INTO solar_predictions (student_name, model_name, target_time, predicted_value) 
           VALUES (?, ?, ?, ?)`,
          [studentName, modelName, data.time, data.value]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}