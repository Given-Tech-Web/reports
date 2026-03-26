# Developer Guide

MySolar Reports System 개발자 가이드

## 목차
1. [프로젝트 구조](#프로젝트-구조)
2. [개발 환경 설정](#개발-환경-설정)
3. [아키텍처 개요](#아키텍처-개요)
4. [핵심 컴포넌트](#핵심-컴포넌트)
5. [데이터 흐름](#데이터-흐름)
6. [개발 가이드라인](#개발-가이드라인)
7. [테스팅](#테스팅)
8. [성능 최적화](#성능-최적화)

## 프로젝트 구조

```
mysolar-reports-system/
├── app/                        # Next.js 13+ App Router
│   ├── admin/                  # 관리자 페이지
│   │   ├── daily-closing/      # 일별 마감 페이지
│   │   ├── monthly-closing/    # 월별 마감 페이지
│   │   ├── yearly-closing/     # 연간 마감 페이지
│   │   ├── settings/           # 시스템 설정 페이지
│   │   ├── layout.tsx          # 관리자 레이아웃
│   │   └── page.tsx            # 관리자 대시보드
│   ├── api/                    # API 라우트
│   │   ├── auth/               # 인증 관련 API
│   │   │   ├── login/          # 로그인
│   │   │   ├── logout/         # 로그아웃
│   │   │   └── change-password/# 비밀번호 변경
│   │   └── reports/            # 리포트 API
│   │       ├── carbon/         # 탄소 절감량
│   │       ├── daily/          # 일별 데이터
│   │       ├── weekly/         # 주간 데이터
│   │       ├── monthly/        # 월별 데이터
│   │       ├── yearly/         # 연간 데이터
│   │       ├── comprehensive/  # 종합 통계
│   │       ├── daily-closing/  # 일별 마감
│   │       ├── monthly-closing/# 월별 마감
│   │       └── yearly-closing/ # 연간 마감
│   ├── lib/                    # 앱 내부 라이브러리
│   │   ├── init-scheduler.ts   # 스케줄러 초기화
│   │   └── scheduler.ts        # 스케줄러 구현
│   ├── login/                  # 로그인 페이지
│   ├── globals.css             # 전역 스타일
│   ├── layout.tsx              # 루트 레이아웃
│   └── page.tsx                # 메인 대시보드
├── components/                  # React 컴포넌트
│   └── reports/                # 리포트 컴포넌트
│       ├── DailyEnergyChart.tsx    # 일별 에너지 차트
│       ├── WeeklyTrendChart.tsx    # 주간 트렌드 차트
│       ├── PeriodChart.tsx         # 기간별 차트
│       └── CarbonReductionCard.tsx # 탄소 절감량 카드
├── data/                       # 데이터 파일
│   └── users.json              # 사용자 정보
├── lib/                        # 공유 라이브러리
│   └── db.ts                   # 데이터베이스 연결
├── public/                     # 정적 파일
├── docs/                       # 문서
│   ├── API_DOCUMENTATION.md    # API 문서
│   ├── DEPLOYMENT_GUIDE.md     # 배포 가이드
│   └── DEVELOPER_GUIDE.md      # 개발자 가이드
├── .env                        # 환경 변수
├── .env.example                # 환경 변수 예제
├── next.config.ts              # Next.js 설정
├── package.json                # 프로젝트 메타데이터
├── tailwind.config.ts          # Tailwind CSS 설정
└── tsconfig.json               # TypeScript 설정
```

## 개발 환경 설정

### 1. 필수 도구 설치
```bash
# Node.js 18+ 설치
# https://nodejs.org/

# VS Code 추천 확장
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
```

### 2. 프로젝트 설정
```bash
# 저장소 클론
git clone https://github.com/utonics/mysolar-reports-system.git
cd mysolar-reports-system

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 개발 서버 실행
npm run dev
```

### 3. 데이터베이스 설정
```sql
-- 필요한 테이블 생성 (자동 생성됨)
-- daily_inverter_stats
-- monthly_inverter_stats
-- yearly_inverter_stats
```

## 아키텍처 개요

### 기술 스택
- **Frontend**: Next.js 15.5.3, React 19.1.0, TypeScript
- **Styling**: Tailwind CSS 3.4
- **Charts**: Recharts 2.15
- **Database**: MariaDB (mysql2/promise)
- **Authentication**: Cookie-based JWT
- **Password Hashing**: bcryptjs

### 데이터 계층 구조
```
원시 데이터 (raw_inverter_data)
    ↓ 일별 마감
일별 집계 (daily_inverter_stats)
    ↓ 월별 마감
월별 집계 (monthly_inverter_stats)
    ↓ 연간 마감
연간 집계 (yearly_inverter_stats)
```

## 핵심 컴포넌트

### 1. 데이터베이스 연결 (lib/db.ts)
```typescript
import mysql from 'mysql2/promise';

export async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.MARIADB_HOST,
    port: parseInt(process.env.MARIADB_PORT || '3306'),
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,
  });
  return connection;
}
```

### 2. API Route 구조
```typescript
// app/api/reports/carbon/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 1. 파라미터 파싱
    const { searchParams } = new URL(request.url);

    // 2. 데이터베이스 쿼리
    const connection = await getConnection();
    const [rows] = await connection.execute(query, params);

    // 3. 데이터 처리
    const processedData = processData(rows);

    // 4. 응답 반환
    return NextResponse.json(processedData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 3. React 컴포넌트 패턴
```typescript
// components/reports/DailyEnergyChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DailyEnergyChartProps {
  date?: string;
  deviceId?: string;
}

export default function DailyEnergyChart({ date, deviceId }: DailyEnergyChartProps) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [date, deviceId]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/reports/daily?date=${date}`);
      const result = await response.json();
      setData(result.hourlyData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <LineChart width={800} height={400} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="hour" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="energyGenerated" stroke="#10b981" />
      <Line type="monotone" dataKey="carbonReduction" stroke="#3b82f6" />
    </LineChart>
  );
}
```

### 4. 인증 미들웨어
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 관리자 경로 보호
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth-token');

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
```

## 데이터 흐름

### 1. 사용자 요청 흐름
```
User → Next.js Route → API Handler → Database → Response
```

### 2. 데이터 집계 흐름
```
Raw Data Collection (30초마다)
    ↓
Daily Closing (매일 새벽 2시)
    ↓
Monthly Closing (매월 1일)
    ↓
Yearly Closing (매년 1월 1일)
```

### 3. 인증 흐름
```
Login Request
    ↓
Verify Credentials
    ↓
Generate JWT Token
    ↓
Set HttpOnly Cookie
    ↓
Protected Routes Access
```

## 개발 가이드라인

### 코딩 표준

#### TypeScript 사용
```typescript
// ✅ Good
interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

// ❌ Bad
const user: any = {
  id: '1',
  username: 'admin'
};
```

#### 에러 처리
```typescript
// ✅ Good
try {
  const result = await fetchData();
  return { success: true, data: result };
} catch (error) {
  console.error('Specific error context:', error);
  return { success: false, error: error.message };
}

// ❌ Bad
try {
  return await fetchData();
} catch (e) {
  throw e;
}
```

#### 컴포넌트 구조
```typescript
// ✅ Good - 단일 책임 원칙
function UserAvatar({ user }: { user: User }) {
  return <img src={user.avatar} alt={user.name} />;
}

function UserInfo({ user }: { user: User }) {
  return (
    <div>
      <UserAvatar user={user} />
      <span>{user.name}</span>
    </div>
  );
}

// ❌ Bad - 복잡한 단일 컴포넌트
function UserCard({ user, posts, comments, likes }) {
  // 너무 많은 책임
}
```

### Git 커밋 컨벤션
```bash
# 기능 추가
feat: 일별 마감 기능 구현

# 버그 수정
fix: 로그인 세션 만료 문제 해결

# 문서 업데이트
docs: API 문서 업데이트

# 스타일 변경
style: 대시보드 레이아웃 개선

# 리팩토링
refactor: 데이터베이스 연결 로직 개선

# 테스트
test: 인증 API 테스트 추가

# 기타
chore: 의존성 업데이트
```

## 테스팅

### 단위 테스트
```typescript
// __tests__/api/auth.test.ts
import { POST } from '@/app/api/auth/login/route';

describe('Login API', () => {
  test('successful login', async () => {
    const request = new Request('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### E2E 테스트
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('admin login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/admin');
});
```

## 성능 최적화

### 1. 데이터베이스 최적화
```sql
-- 인덱스 추가
CREATE INDEX idx_device_date ON daily_inverter_stats(device_id, date);
CREATE INDEX idx_device_year_month ON monthly_inverter_stats(device_id, year, month);
CREATE INDEX idx_device_year ON yearly_inverter_stats(device_id, year);

-- 쿼리 최적화 예제
-- ✅ Good - 집계 테이블 사용
SELECT * FROM daily_inverter_stats
WHERE device_id = ? AND date BETWEEN ? AND ?;

-- ❌ Bad - 원시 데이터 직접 집계
SELECT DATE(timestamp) as date, SUM(pv1_charging_power)
FROM raw_inverter_data
GROUP BY DATE(timestamp);
```

### 2. 프론트엔드 최적화
```typescript
// 데이터 캐싱
const CACHE_DURATION = 5 * 60 * 1000; // 5분

const cache = new Map();

async function fetchWithCache(url: string) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const response = await fetch(url);
  const data = await response.json();

  cache.set(url, {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

### 3. 이미지 최적화
```typescript
import Image from 'next/image';

// Next.js 이미지 최적화 사용
<Image
  src="/solar-panel.jpg"
  alt="Solar Panel"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

## 일반적인 작업

### 새로운 API 엔드포인트 추가
1. `app/api/` 디렉토리에 새 폴더 생성
2. `route.ts` 파일 생성
3. HTTP 메서드 함수 구현 (GET, POST, etc.)
4. API 문서 업데이트

### 새로운 차트 컴포넌트 추가
1. `components/reports/` 디렉토리에 컴포넌트 생성
2. Recharts 라이브러리 사용
3. 데이터 fetching 로직 구현
4. 로딩 및 에러 상태 처리

### 새로운 관리자 페이지 추가
1. `app/admin/` 디렉토리에 폴더 생성
2. `page.tsx` 파일 생성
3. 관리자 레이아웃 자동 적용
4. 메뉴 항목 추가 (layout.tsx)

## 문제 해결

### 일반적인 문제

#### CORS 오류
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ];
  },
};
```

#### 타입 오류
```bash
# 타입 체크
npm run type-check

# 타입 정의 생성
npx tsc --declaration
```

#### 빌드 오류
```bash
# 캐시 삭제
rm -rf .next

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 재빌드
npm run build
```

## 기여 가이드

### Pull Request 프로세스
1. Feature 브랜치 생성
2. 변경 사항 구현
3. 테스트 작성 및 실행
4. 문서 업데이트
5. PR 생성 및 리뷰 요청

### 코드 리뷰 체크리스트
- [ ] 코드가 프로젝트 스타일 가이드를 따르는가?
- [ ] 적절한 에러 처리가 구현되었는가?
- [ ] 테스트가 작성되었는가?
- [ ] 문서가 업데이트되었는가?
- [ ] 성능 영향을 고려했는가?
- [ ] 보안 이슈는 없는가?
