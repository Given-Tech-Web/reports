'use client';

import { useState } from 'react';

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
}

interface Result {
  message?: string;
  error?: string;
  details?: any;
  summary?: {
    total_energy_kwh: number;
    total_carbon_kg: number;
    peak_power_w: number;
    records_processed: number;
  };
  dates?: string[];
  total?: number;
  successful?: number;
  failed?: number;
  success?: boolean;
}

export default function DailyClosingAdmin() {
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() - 86400000).toISOString().split('T')[0] // Yesterday
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [missingDates, setMissingDates] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  // Execute daily closing for a specific date
  const executeClosing = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/reports/daily-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to execute daily closing', details: error });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for missing dates
  const checkMissingDates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports/daily-closing?action=close-missing&days=30');
      const data = await response.json();
      setMissingDates(data.missing_dates || []);
      setResult({
        message: `Found ${data.count} dates requiring closing`,
        dates: data.missing_dates
      });
    } catch (error) {
      setResult({ error: 'Failed to check missing dates', details: error });
    } finally {
      setIsLoading(false);
    }
  };

  // Close all missing dates
  const closeAllMissing = async () => {
    if (missingDates.length === 0) {
      setResult({ message: 'No missing dates to close' });
      return;
    }

    setIsLoading(true);
    setBatchProgress({ total: missingDates.length, completed: 0, failed: 0 });

    const results = [];
    for (let i = 0; i < missingDates.length; i++) {
      const date = new Date(missingDates[i]).toISOString().split('T')[0];

      try {
        const response = await fetch('/api/reports/daily-closing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: date,
            deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
          })
        });

        const data = await response.json();
        results.push({ date, success: data.success });

        setBatchProgress({
          total: missingDates.length,
          completed: i + 1,
          failed: results.filter(r => !r.success).length
        });
      } catch (error) {
        results.push({ date, success: false, error });
        setBatchProgress((prev: BatchProgress | null) => ({
          ...prev!,
          completed: i + 1,
          failed: (prev?.failed || 0) + 1
        }));
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setResult({
      message: 'Batch closing completed',
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    });

    setBatchProgress(null);
    setIsLoading(false);
    setMissingDates([]);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">일별 마감 관리</h1>
        <p className="text-gray-600 mt-2">태양광 발전 데이터를 일별로 집계하여 보고서 성능을 최적화합니다.</p>
      </div>

      {/* What is Daily Closing? */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">📚 일별 마감이란?</h2>
        <div className="text-gray-700 space-y-2">
          <p>일별 마감은 하루 동안 수집된 태양광 발전 데이터를 집계하여 별도의 테이블에 저장하는 프로세스입니다.</p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">🚀 주요 이점</h3>
              <ul className="text-sm space-y-1">
                <li>• 보고서 조회 속도 10배 이상 향상</li>
                <li>• 데이터베이스 부하 감소</li>
                <li>• 과거 데이터 일관성 보장</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ 집계 항목</h3>
              <ul className="text-sm space-y-1">
                <li>• 일일 총 발전량 (kWh)</li>
                <li>• 탄소 절감량 (kg CO₂)</li>
                <li>• 평균/최대 발전 출력</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Closing Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📅 수동 마감 실행</h2>
        <p className="text-gray-600 text-sm mb-4">특정 날짜의 데이터를 수동으로 마감할 수 있습니다.</p>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                마감할 날짜 선택
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={executeClosing}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '처리중...' : '마감 실행'}
            </button>
          </div>
        </div>

      {/* Batch Closing Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🔄 일괄 마감 처리</h2>
        <p className="text-gray-600 text-sm mb-4">아직 마감되지 않은 날짜를 자동으로 찾아 일괄 처리합니다.</p>
          <div className="flex gap-4">
            <button
              onClick={checkMissingDates}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
            >
              누락 날짜 확인
            </button>
            {missingDates.length > 0 && (
              <button
                onClick={closeAllMissing}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                전체 마감 실행 ({missingDates.length}개)
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {batchProgress && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">
                처리 중: {batchProgress.completed} / {batchProgress.total}
                {batchProgress.failed > 0 && ` (${batchProgress.failed}개 실패)`}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(batchProgress.completed / batchProgress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Result Display */}
        {result && (
          <div className={`bg-white rounded-lg shadow-md p-6 ${result.error ? 'border-red-500 border' : ''}`}>
            <h3 className="text-lg font-semibold mb-3">
              {result.error ? '❌ 오류' : '✅ 처리 결과'}
            </h3>

            {result.error ? (
              <div className="text-red-600">
                <p>{result.error}</p>
                {result.details && (
                  <pre className="mt-2 text-sm bg-red-50 p-2 rounded">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div>
                {result.message && (
                  <p className="text-green-600 mb-3">{result.message}</p>
                )}

                {result.summary && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">총 발전량</p>
                      <p className="text-lg font-semibold">
                        {result.summary.total_energy_kwh.toFixed(2)} kWh
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">탄소 절감</p>
                      <p className="text-lg font-semibold">
                        {result.summary.total_carbon_kg.toFixed(2)} kg
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">최대 출력</p>
                      <p className="text-lg font-semibold">
                        {result.summary.peak_power_w.toFixed(0)} W
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">처리 레코드</p>
                      <p className="text-lg font-semibold">
                        {result.summary.records_processed}
                      </p>
                    </div>
                  </div>
                )}

                {result.dates && result.dates.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">마감 필요 날짜:</h4>
                    <div className="max-h-40 overflow-y-auto">
                      {result.dates.map((date: string, idx: number) => (
                        <div key={idx} className="py-1 px-2 hover:bg-gray-50">
                          {new Date(date).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.details && Array.isArray(result.details) && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">일괄 처리 결과:</h4>
                    <div className="text-sm">
                      <p>전체: {result.total}개, 성공: {result.successful}개, 실패: {result.failed}개</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Instructions */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
        <h3 className="font-semibold text-amber-900 mb-3">💡 사용 가이드</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-amber-800 mb-2">자동 실행</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 매일 밤 00:05에 자동 실행</li>
              <li>• 전날 데이터 자동 집계</li>
              <li>• 환경 변수로 활성화 설정</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-amber-800 mb-2">수동 실행</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 누락된 날짜 확인 후 처리</li>
              <li>• 특정 날짜 재처리 가능</li>
              <li>• 일괄 처리로 시간 단축</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-100 rounded-lg">
          <p className="text-sm text-amber-900">
            <strong>⚠️ 주의사항:</strong> 마감 처리는 데이터가 완전히 수집된 다음날 진행하는 것이 좋습니다.
            당일 데이터는 아직 수집 중일 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}