'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              접근이 거부되었습니다
            </h1>
            <p className="text-gray-600">
              이 페이지는 관리자만 접근할 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              관리자 권한이 필요한 페이지입니다.<br />
              일반 사용자는 리포트 페이지에서 태양광 발전 데이터를 확인할 수 있습니다.
            </p>

            <div className="pt-4 space-y-2">
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                홈으로 돌아가기
              </button>

              <button
                onClick={() => router.back()}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                이전 페이지로
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            관리자 권한이 필요하신가요?<br />
            시스템 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </div>
  );
}