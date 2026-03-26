'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [recentClosings, setRecentClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get recent closing status
      const response = await fetch('/api/reports/daily-closing');
      const data = await response.json();
      setRecentClosings(data.recent_closings || []);

      // Check missing dates
      const missingResponse = await fetch('/api/reports/daily-closing?action=close-missing&days=7');
      const missingData = await missingResponse.json();

      setSystemStatus({
        missingCount: missingData.count || 0,
        lastUpdate: new Date().toLocaleString('ko-KR')
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminCards = [
    {
      title: '일별 마감 관리',
      icon: '📅',
      description: '매일 발전 데이터를 집계하여 보고서 성능을 최적화합니다.',
      link: '/admin/daily-closing',
      color: 'bg-blue-500',
      stats: systemStatus?.missingCount > 0
        ? `${systemStatus.missingCount}개 날짜 마감 필요`
        : '모든 데이터 최신 상태'
    },
    {
      title: '월별 마감 관리',
      icon: '📆',
      description: '월 단위로 데이터를 집계하여 월간 성과를 분석합니다.',
      link: '/admin/monthly-closing',
      color: 'bg-purple-500',
      stats: '월간 집계'
    },
    {
      title: '연간 마감 관리',
      icon: '📈',
      description: '연 단위로 데이터를 집계하여 연간 환경 기여도를 파악합니다.',
      link: '/admin/yearly-closing',
      color: 'bg-indigo-500',
      stats: '연간 분석'
    },
    {
      title: '시스템 설정',
      icon: '⚙️',
      description: '관리자 비밀번호 변경 및 시스템 설정을 관리합니다.',
      link: '/admin/settings',
      color: 'bg-green-500',
      stats: '보안 설정'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-600 mt-2">MySolar Reports System 관리 센터입니다.</p>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">시스템 상태</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">데이터베이스</p>
                <p className="text-2xl font-bold text-green-700">연결됨</p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </div>
          <div className={`${systemStatus?.missingCount > 0 ? 'bg-yellow-50' : 'bg-blue-50'} rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">마감 대기</p>
                <p className="text-2xl font-bold text-gray-700">
                  {loading ? '...' : systemStatus?.missingCount || 0}개
                </p>
              </div>
              <span className="text-3xl">📋</span>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">마지막 업데이트</p>
                <p className="text-lg font-bold text-purple-700">
                  {systemStatus?.lastUpdate || '...'}
                </p>
              </div>
              <span className="text-3xl">🕐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Functions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {adminCards.map((card) => (
          <Link href={card.link} key={card.title}>
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.color} text-white rounded-lg p-3`}>
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {card.stats}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">최근 마감 기록</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩중...</div>
        ) : recentClosings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">날짜</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">발전량 (kWh)</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">탄소 절감 (kg)</th>
                  <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">마감 시간</th>
                </tr>
              </thead>
              <tbody>
                {recentClosings.map((closing: any, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(closing.date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {parseFloat(closing.total_energy_generated || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {parseFloat(closing.total_carbon_reduction || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {closing.created_at
                        ? new Date(closing.created_at).toLocaleString('ko-KR')
                        : closing.updated_at
                          ? new Date(closing.updated_at).toLocaleString('ko-KR')
                          : '시간 정보 없음'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            아직 마감된 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 관리자 안내</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• <strong>일별 마감</strong>: 매일 밤 자동으로 실행되거나 수동으로 실행할 수 있습니다.</p>
          <p>• <strong>성능 최적화</strong>: 마감된 데이터는 집계되어 보고서 조회 속도가 크게 향상됩니다.</p>
          <p>• <strong>데이터 무결성</strong>: 마감 후에도 원본 데이터는 보존되며, 필요시 재집계가 가능합니다.</p>
          <p>• <strong>자동 스케줄러</strong>: 환경 변수에서 ENABLE_DAILY_SCHEDULER=true로 설정하면 자동 실행됩니다.</p>
        </div>
      </div>
    </div>
  );
}