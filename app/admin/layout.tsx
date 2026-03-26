'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      title: '대시보드',
      path: '/admin',
      icon: '📊',
      description: '관리자 메인'
    },
    {
      title: '일별 마감 관리',
      path: '/admin/daily-closing',
      icon: '📅',
      description: '일일 데이터 집계'
    },
    {
      title: '월별 마감 관리',
      path: '/admin/monthly-closing',
      icon: '📆',
      description: '월간 데이터 집계'
    },
    {
      title: '연간 마감 관리',
      path: '/admin/yearly-closing',
      icon: '📈',
      description: '연간 성과 분석'
    },
    {
      title: '시스템 설정',
      path: '/admin/settings',
      icon: '⚙️',
      description: '비밀번호 변경'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">
            MySolar Admin
          </h1>
          <p className="text-sm text-gray-600 mt-1">시스템 관리</p>
        </div>

        <nav className="px-4 pb-6">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-lg
                      transition-all duration-200
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{item.icon}</span>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs opacity-75">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-blue-600">
                        <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M9 5l7 7-7 7"></path>
                        </svg>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="flex items-center px-4 py-3 text-gray-700 hover:text-blue-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-xl mr-3">🏠</span>
              <span className="font-medium">메인으로 돌아가기</span>
            </Link>
            <button
              onClick={async () => {
                try {
                  // Call logout API
                  const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });

                  if (response.ok) {
                    // Clear local storage
                    localStorage.removeItem('token');
                    // Redirect to login page
                    router.push('/login');
                  } else {
                    console.error('Logout failed');
                    alert('로그아웃 실패');
                  }
                } catch (error) {
                  console.error('Logout error:', error);
                  alert('로그아웃 중 오류가 발생했습니다.');
                }
              }}
              className="flex items-center px-4 py-3 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors w-full mt-2"
            >
              <span className="text-xl mr-3">🚪</span>
              <span className="font-medium">로그아웃</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}