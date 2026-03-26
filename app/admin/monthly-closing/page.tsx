'use client';

import { useState, useEffect } from 'react';

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
    avg_daily_kwh: number;
    peak_day_kwh: number;
    days_with_data: number;
    days_operated?: number;
    peak_power_w?: number;
  };
  months?: any[];
  total?: number;
  successful?: number;
  failed?: number;
  success?: boolean;
}

interface MissingMonth {
  year: number;
  month: number;
}

export default function MonthlyClosingAdmin() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [missingMonths, setMissingMonths] = useState<MissingMonth[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    // Generate available years (current year and previous 5 years)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear - i);
    }
    setAvailableYears(years);
  }, []);

  // Execute monthly closing for a specific month
  const executeClosing = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/reports/monthly-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to execute monthly closing', details: error });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for missing months
  const checkMissingMonths = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/monthly-closing?action=close-missing&year=${selectedYear}`);
      const data = await response.json();
      setMissingMonths(data.missing_months || []);
      setResult({
        message: `${selectedYear}년에 ${data.count}개월 마감 필요`,
        months: data.missing_months
      });
    } catch (error) {
      setResult({ error: 'Failed to check missing months', details: error });
    } finally {
      setIsLoading(false);
    }
  };

  // Close all missing months
  const closeAllMissing = async () => {
    if (missingMonths.length === 0) {
      setResult({ message: 'No missing months to close' });
      return;
    }

    setIsLoading(true);
    setBatchProgress({ total: missingMonths.length, completed: 0, failed: 0 });

    const results = [];
    for (let i = 0; i < missingMonths.length; i++) {
      const monthData = missingMonths[i];

      try {
        const response = await fetch('/api/reports/monthly-closing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: monthData.year,
            month: monthData.month,
            deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
          })
        });

        const data = await response.json();
        results.push({ ...monthData, success: data.success });

        setBatchProgress({
          total: missingMonths.length,
          completed: i + 1,
          failed: results.filter(r => !r.success).length
        });
      } catch (error) {
        results.push({ ...monthData, success: false, error });
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
      message: '월별 마감 완료',
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    });

    setBatchProgress(null);
    setIsLoading(false);
    setMissingMonths([]);
  };

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">월별 마감 관리</h1>
        <p className="text-gray-600 mt-2">월 단위로 태양광 발전 데이터를 집계하여 월간 보고서를 생성합니다.</p>
      </div>

      {/* What is Monthly Closing? */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-purple-900 mb-3">📊 월별 마감이란?</h2>
        <div className="text-gray-700 space-y-2">
          <p>일별 마감 데이터를 월 단위로 집계하여 월간 성과를 파악하는 프로세스입니다.</p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2">📈 주요 지표</h3>
              <ul className="text-sm space-y-1">
                <li>• 월간 총 발전량 (kWh)</li>
                <li>• 월간 탄소 절감량 (kg)</li>
                <li>• 운영 일수 및 평균 효율</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-pink-800 mb-2">⚡ 활용 방안</h3>
              <ul className="text-sm space-y-1">
                <li>• 월간 성과 보고서</li>
                <li>• 전월 대비 분석</li>
                <li>• 계절별 패턴 파악</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Closing Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📅 수동 월별 마감</h2>
        <p className="text-gray-600 text-sm mb-4">특정 월의 데이터를 수동으로 마감할 수 있습니다.</p>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연도 선택
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              월 선택
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>{name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={executeClosing}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리중...' : '마감 실행'}
          </button>
        </div>
      </div>

      {/* Batch Closing Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🔄 일괄 월별 마감</h2>
        <p className="text-gray-600 text-sm mb-4">선택한 연도의 마감되지 않은 월을 일괄 처리합니다.</p>
        <div className="flex gap-4">
          <button
            onClick={checkMissingMonths}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
          >
            누락 월 확인
          </button>
          {missingMonths.length > 0 && (
            <button
              onClick={closeAllMissing}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              전체 마감 실행 ({missingMonths.length}개월)
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
                className="bg-purple-600 h-2 rounded-full transition-all"
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
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-gray-600">월간 발전량</p>
                    <p className="text-lg font-semibold">
                      {result.summary.total_energy_kwh.toFixed(2)} kWh
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-gray-600">탄소 절감</p>
                    <p className="text-lg font-semibold">
                      {result.summary.total_carbon_kg.toFixed(2)} kg
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-gray-600">운영 일수</p>
                    <p className="text-lg font-semibold">
                      {result.summary.days_operated || result.summary.days_with_data}일
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-gray-600">최대 출력</p>
                    <p className="text-lg font-semibold">
                      {result.summary.peak_power_w ? result.summary.peak_power_w.toFixed(0) : 'N/A'} W
                    </p>
                  </div>
                </div>
              )}

              {result.months && result.months.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">마감 필요 월:</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.months.map((month: any, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {month.display}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-3">💡 사용 가이드</h3>
        <ul className="text-sm text-purple-800 space-y-2">
          <li>• <strong>월별 마감</strong>: 매월 1일 전월 데이터를 마감하는 것을 권장합니다.</li>
          <li>• <strong>일괄 처리</strong>: 한 해의 모든 월을 한번에 마감할 수 있습니다.</li>
          <li>• <strong>재처리</strong>: 이미 마감된 월도 다시 처리하여 최신 데이터로 갱신 가능합니다.</li>
          <li>• <strong>성과 분석</strong>: 월별 마감 데이터는 월간/분기별 보고서 생성에 활용됩니다.</li>
        </ul>
      </div>
    </div>
  );
}