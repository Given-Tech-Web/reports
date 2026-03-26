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
    avg_monthly_kwh: number;
    peak_month_kwh: number;
    months_with_data: number;
    months_operated?: number;
    days_operated?: number;
    peak_power_w?: number;
  };
  years?: number[];
  total?: number;
  successful?: number;
  failed?: number;
  success?: boolean;
}

interface YearlyStat {
  year: number;
  total_energy_kwh?: number;
  total_carbon_kg?: number;
  total_energy_generated?: number | string;
  total_carbon_reduction?: number | string;
  months_operated: number;
  days_operated?: number;
  closing_date: string;
}

export default function YearlyClosingAdmin() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [missingYears, setMissingYears] = useState<number[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearlyStats, setYearlyStats] = useState<YearlyStat[]>([]);

  useEffect(() => {
    // Generate available years (current year and previous 5 years)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear - i);
    }
    setAvailableYears(years);

    // Fetch existing yearly stats
    fetchYearlyStats();
  }, []);

  const fetchYearlyStats = async () => {
    try {
      const response = await fetch('/api/reports/yearly-closing');
      const data = await response.json();
      setYearlyStats(data.yearly_closings || []);
    } catch (error) {
      console.error('Failed to fetch yearly stats:', error);
    }
  };

  // Execute yearly closing for a specific year
  const executeClosing = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/reports/yearly-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
        })
      });

      const data = await response.json();
      setResult(data);

      // Refresh yearly stats after closing
      if (data.success) {
        fetchYearlyStats();
      }
    } catch (error) {
      setResult({ error: 'Failed to execute yearly closing', details: error });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for missing years
  const checkMissingYears = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports/yearly-closing?action=close-missing');
      const data = await response.json();
      setMissingYears(data.missing_years || []);
      setResult({
        message: `${data.count}개 연도 마감 필요`,
        years: data.missing_years
      });
    } catch (error) {
      setResult({ error: 'Failed to check missing years', details: error });
    } finally {
      setIsLoading(false);
    }
  };

  // Close all missing years
  const closeAllMissing = async () => {
    if (missingYears.length === 0) {
      setResult({ message: 'No missing years to close' });
      return;
    }

    setIsLoading(true);
    setBatchProgress({ total: missingYears.length, completed: 0, failed: 0 });

    const results = [];
    for (let i = 0; i < missingYears.length; i++) {
      const year = missingYears[i];

      try {
        const response = await fetch('/api/reports/yearly-closing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: year,
            deviceId: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001'
          })
        });

        const data = await response.json();
        results.push({ year, success: data.success });

        setBatchProgress({
          total: missingYears.length,
          completed: i + 1,
          failed: results.filter(r => !r.success).length
        });
      } catch (error) {
        results.push({ year, success: false, error });
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
      message: '연간 마감 완료',
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    });

    setBatchProgress(null);
    setIsLoading(false);
    setMissingYears([]);
    fetchYearlyStats();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">연간 마감 관리</h1>
        <p className="text-gray-600 mt-2">연 단위로 태양광 발전 데이터를 집계하여 연간 성과를 분석합니다.</p>
      </div>

      {/* What is Yearly Closing? */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-3">📈 연간 마감이란?</h2>
        <div className="text-gray-700 space-y-2">
          <p>월별 마감 데이터를 연 단위로 집계하여 연간 성과와 환경 기여도를 파악하는 프로세스입니다.</p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-indigo-800 mb-2">🎯 핵심 지표</h3>
              <ul className="text-sm space-y-1">
                <li>• 연간 총 발전량 (kWh)</li>
                <li>• 연간 탄소 절감량 (kg)</li>
                <li>• 월별 운영 현황</li>
                <li>• 연간 최대 발전 출력</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">🌱 환경 영향</h3>
              <ul className="text-sm space-y-1">
                <li>• 나무 심기 효과</li>
                <li>• 자동차 운행 절감</li>
                <li>• 가정 전력 공급</li>
                <li>• 석탄 사용 절감</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Closing Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📅 수동 연간 마감</h2>
        <p className="text-gray-600 text-sm mb-4">특정 연도의 데이터를 수동으로 마감할 수 있습니다.</p>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연도 선택
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <button
            onClick={executeClosing}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리중...' : '마감 실행'}
          </button>
        </div>
      </div>

      {/* Batch Closing Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🔄 일괄 연간 마감</h2>
        <p className="text-gray-600 text-sm mb-4">마감되지 않은 모든 연도를 일괄 처리합니다.</p>
        <div className="flex gap-4">
          <button
            onClick={checkMissingYears}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
          >
            누락 연도 확인
          </button>
          {missingYears.length > 0 && (
            <button
              onClick={closeAllMissing}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              전체 마감 실행 ({missingYears.length}개 연도)
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
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(batchProgress.completed / batchProgress.total) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Existing Yearly Stats */}
      {yearlyStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 연간 마감 현황</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">연도</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">총 발전량 (kWh)</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">탄소 절감 (kg)</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">운영 월수</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">운영 일수</th>
                </tr>
              </thead>
              <tbody>
                {yearlyStats.map((stat, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold">{stat.year}년</td>
                    <td className="px-4 py-3 text-sm">
                      {parseFloat(String(stat.total_energy_generated || 0)).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">
                      {parseFloat(String(stat.total_carbon_reduction || 0)).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm">{stat.months_operated}개월</td>
                    <td className="px-4 py-3 text-sm">{stat.days_operated}일</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="bg-indigo-50 p-3 rounded">
                    <p className="text-sm text-gray-600">연간 발전량</p>
                    <p className="text-lg font-semibold">
                      {result.summary.total_energy_kwh.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} kWh
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm text-gray-600">탄소 절감</p>
                    <p className="text-lg font-semibold text-green-700">
                      {result.summary.total_carbon_kg.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} kg
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-gray-600">운영 기간</p>
                    <p className="text-lg font-semibold">
                      {result.summary.months_operated || result.summary.months_with_data}개월 / {result.summary.days_operated || 0}일
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded">
                    <p className="text-sm text-gray-600">최대 출력</p>
                    <p className="text-lg font-semibold">
                      {result.summary.peak_power_w ? result.summary.peak_power_w.toFixed(0) : 'N/A'} W
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded">
                    <p className="text-sm text-gray-600">나무 심기 효과</p>
                    <p className="text-lg font-semibold text-emerald-700">
                      {Math.round(result.summary.total_carbon_kg / 21)}그루
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-gray-600">자동차 절감</p>
                    <p className="text-lg font-semibold text-purple-700">
                      {(result.summary.total_carbon_kg / 4600).toFixed(2)}대/년
                    </p>
                  </div>
                </div>
              )}

              {result.years && result.years.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">마감 필요 연도:</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.years.map((year: number, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        {year}년
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
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-lg">
        <h3 className="font-semibold text-indigo-900 mb-3">💡 사용 가이드</h3>
        <ul className="text-sm text-indigo-800 space-y-2">
          <li>• <strong>연간 마감</strong>: 매년 1월에 전년도 데이터를 마감하는 것을 권장합니다.</li>
          <li>• <strong>환경 영향 분석</strong>: 연간 마감 데이터로 환경 기여도를 정확히 파악할 수 있습니다.</li>
          <li>• <strong>성과 비교</strong>: 연도별 데이터를 비교하여 발전 효율 추이를 분석합니다.</li>
          <li>• <strong>보고서 활용</strong>: 연간 마감 데이터는 ESG 보고서 및 환경 인증에 활용됩니다.</li>
        </ul>
      </div>
    </div>
  );
}