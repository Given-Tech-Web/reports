# MySolar Reports System - 프로젝트 문서

## 📚 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [기술 상세](#기술-상세)
4. [API 문서](#api-문서)
5. [데이터베이스 설계](#데이터베이스-설계)
6. [컴포넌트 문서](#컴포넌트-문서)
7. [배포 가이드](#배포-가이드)
8. [유지보수 가이드](#유지보수-가이드)

---

## 프로젝트 개요

### 프로젝트 정보
- **프로젝트명**: MySolar Reports System
- **버전**: 0.1.0
- **목적**: 태양광 에너지 모니터링 및 탄소 절감량 리포팅 대시보드
- **개발 시작**: 2025년 1월

### 핵심 기능
1. **실시간 모니터링**
   - 태양광 발전량 실시간 추적
   - 배터리 상태 모니터링
   - 인버터 성능 분석

2. **환경 영향 분석**
   - CO₂ 절감량 계산
   - 환경 등가 지표 (나무, 자동차, 가정 전력)
   - 장기 환경 영향 추적

3. **데이터 시각화**
   - 일별/주별/월별/연도별 차트
   - 트렌드 분석
   - 성능 비교

---

## 시스템 아키텍처

### 전체 아키텍처
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Edge Layer    │────▶│  Cloud Layer    │────▶│    App Layer    │
│ (Raspberry Pi)  │MQTT │  (Data Server)  │API  │ (Next.js App)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   [SQLite Buffer]         [MariaDB]              [Web Dashboard]
```

### Reports System 아키텍처
```
┌─────────────────────────────────────────────┐
│            Next.js Application              │
├─────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Pages   │  │   API    │  │   Libs   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│        │             │              │       │
│        ▼             ▼              ▼       │
│  ┌──────────────────────────────────────┐ │
│  │         React Components             │ │
│  └──────────────────────────────────────┘ │
│                     │                       │
│                     ▼                       │
│  ┌──────────────────────────────────────┐ │
│  │          Recharts Library            │ │
│  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │    MariaDB      │
            └─────────────────┘
```

---

## 기술 상세

### Frontend 기술 스택
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.5.3 | React 프레임워크 |
| React | 19.1.0 | UI 라이브러리 |
| TypeScript | 5.x | 타입 안정성 |
| Tailwind CSS | 3.4.1 | 스타일링 |
| Recharts | 2.15.0 | 차트 라이브러리 |

### Backend 기술 스택
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js API Routes | 15.5.3 | API 엔드포인트 |
| MySQL2 | 3.11.5 | 데이터베이스 연결 |
| MariaDB | 11.x | 데이터 저장소 |

### 개발 도구
| 도구 | 용도 |
|------|------|
| ESLint | 코드 품질 |
| Prettier | 코드 포맷팅 |
| TypeScript | 타입 체킹 |

---

## API 문서

### 기본 정보
- **Base URL**: `http://localhost:3001/api`
- **인증**: 현재 없음 (개발 중)
- **응답 형식**: JSON

### 엔드포인트 상세

#### 1. 탄소 절감량 조회
```http
GET /api/reports/carbon
```

**응답 예시**:
```json
{
  "totalCarbon": 15234.67,
  "today": 45.23,
  "thisWeek": 315.67,
  "thisMonth": 1234.56,
  "thisYear": 15234.67,
  "equivalents": {
    "trees": 726,
    "cars": 3.31,
    "households": 1385,
    "coal": 17119
  }
}
```

#### 2. 일별 데이터 조회
```http
GET /api/reports/daily
```

**응답 예시**:
```json
{
  "data": [
    {
      "time": "00:00",
      "solar": 0,
      "carbon": 0
    },
    {
      "time": "12:00",
      "solar": 3.45,
      "carbon": 1.65
    }
  ],
  "summary": {
    "totalSolar": 45.67,
    "totalCarbon": 21.84,
    "peakHour": "14:00",
    "peakPower": 4.56
  }
}
```

#### 3. 주간 트렌드 조회
```http
GET /api/reports/weekly
```

**응답 예시**:
```json
{
  "data": [
    {
      "date": "2025-01-13",
      "dayName": "월",
      "solar": 45.67,
      "carbon": 21.84
    }
  ],
  "summary": {
    "totalSolar": 320.45,
    "totalCarbon": 153.29,
    "avgDaily": 45.78
  }
}
```

#### 4. 월별 데이터 조회
```http
GET /api/reports/monthly?year=2025
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| year | number | 아니오 | 조회 연도 (기본: 현재 연도) |

#### 5. 연도별 비교
```http
GET /api/reports/yearly
```

**응답 예시**:
```json
{
  "data": [
    {
      "year": 2024,
      "solar": 4567.89,
      "carbon": 2184.56
    },
    {
      "year": 2025,
      "solar": 234.56,
      "carbon": 112.16
    }
  ]
}
```

#### 6. 종합 통계
```http
GET /api/reports/comprehensive
```

**응답 예시**:
```json
{
  "lifetime": {
    "solar": 4802.45,
    "carbon": 2296.72,
    "days": 365,
    "avgDaily": 13.16
  },
  "currentYear": {
    "solar": 234.56,
    "carbon": 112.16
  },
  "bestDay": {
    "date": "2024-06-15",
    "solar": 56.78,
    "carbon": 27.14
  }
}
```

---

## 데이터베이스 설계

### 데이터베이스 연결 정보
```javascript
{
  host: '----',
  port: 3306,
  user: 'root',
  database: 'mysolar',
  connectionLimit: 10
}
```

### 주요 테이블: `raw_inverter_data`

#### 테이블 구조
```sql
CREATE TABLE raw_inverter_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  timestamp DATETIME NOT NULL,
  pv1_charging_power INT NOT NULL,     -- 태양광 발전 전력 (W)
  battery_capacity INT NOT NULL,        -- 배터리 용량 (%)
  carbon_reduction FLOAT,              -- 탄소 절감량 (kg CO₂)
  solar_kwh FLOAT,                     -- 태양광 발전량 (kWh)
  -- 기타 필드들...
  INDEX idx_device_timestamp (device_id, timestamp),
  INDEX idx_timestamp (timestamp)
);
```

#### 데이터 수집 주기
- **수집 간격**: 30초
- **보관 기간**: 60일 (자동 삭제)
- **집계 데이터**: 별도 테이블 (개발 중)

---

## 컴포넌트 문서

### 차트 컴포넌트

#### DailyEnergyChart
**위치**: `/components/reports/DailyEnergyChart.tsx`
**용도**: 24시간 시간대별 발전량 및 탄소 절감량 표시
**Props**:
```typescript
interface Props {
  data?: Array<{
    time: string;
    solar: number;
    carbon: number;
  }>;
}
```

#### WeeklyTrendChart
**위치**: `/components/reports/WeeklyTrendChart.tsx`
**용도**: 7일간 일별 트렌드 바 차트
**Props**:
```typescript
interface Props {
  data?: Array<{
    date: string;
    dayName: string;
    solar: number;
    carbon: number;
  }>;
}
```

#### PeriodChart
**위치**: `/components/reports/PeriodChart.tsx`
**용도**: 월별/연도별/전체 기간 선택 가능한 차트
**Props**:
```typescript
interface Props {
  period: 'month' | 'year' | 'total';
  year?: number;
}
```

### 페이지 구조

#### 메인 페이지 (`/app/page.tsx`)
```typescript
// 주요 섹션
1. 헤더 - 프로젝트 제목 및 날짜
2. 탄소 절감량 요약 카드
3. 환경 영향 지표 (4개 카드)
4. 일별 에너지 차트
5. 주간 트렌드 차트
6. 기간별 차트 (탭 선택)
```

---

## 배포 가이드

### 개발 환경 배포

1. **코드 클론**
```bash
git clone [repository-url]
cd reports-system
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
`.env` 파일 생성:
```env
MARIADB_HOST=118.45.181.229
MARIADB_PORT=3306
MARIADB_USER=root
MARIADB_PASSWORD=Qusrud8545!!@@
MARIADB_DATABASE=mysolar
NEXT_PUBLIC_DEVICE_ID=solar_system_001
```

4. **개발 서버 실행**
```bash
npm run dev
```

### 프로덕션 배포

1. **빌드**
```bash
npm run build
```

2. **프로덕션 테스트**
```bash
npm start
```

3. **PM2를 사용한 프로세스 관리** (권장)
```bash
# PM2 설치
npm install -g pm2

# 앱 시작
pm2 start npm --name "mysolar-reports" -- start

# 자동 시작 설정
pm2 startup
pm2 save
```

4. **Nginx 리버스 프록시 설정**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 유지보수 가이드

### 일상 유지보수

#### 1. 로그 확인
```bash
# PM2 로그
pm2 logs mysolar-reports

# 시스템 로그
tail -f /var/log/nginx/error.log
```

#### 2. 성능 모니터링
```bash
# PM2 모니터링
pm2 monit

# 시스템 리소스
htop
```

#### 3. 데이터베이스 유지보수
```sql
-- 테이블 최적화
OPTIMIZE TABLE raw_inverter_data;

-- 인덱스 재구성
ALTER TABLE raw_inverter_data ENGINE=InnoDB;

-- 오래된 데이터 정리 (60일 이상)
DELETE FROM raw_inverter_data
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 60 DAY);
```

### 문제 해결

#### 1. 캐시 문제
```bash
# Next.js 캐시 삭제
rm -rf .next
rm -rf node_modules/.cache

# npm 캐시 정리
npm cache clean --force

# 재빌드
npm run build
```

#### 2. 데이터베이스 연결 문제
- 환경 변수 확인
- 네트워크 연결 상태 확인
- MariaDB 서버 상태 확인
- 방화벽 규칙 확인

#### 3. 메모리 누수
```bash
# 메모리 사용량 확인
pm2 describe mysolar-reports

# 앱 재시작
pm2 restart mysolar-reports

# 메모리 제한 설정
pm2 start npm --name "mysolar-reports" --max-memory-restart 1G -- start
```

### 백업 전략

#### 1. 코드 백업
- Git 저장소 사용
- 정기적인 커밋 및 푸시
- 태그를 사용한 버전 관리

#### 2. 데이터베이스 백업
```bash
# 일일 백업 스크립트
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h 118.45.181.229 -u root -p mysolar > backup_$DATE.sql
```

#### 3. 환경 설정 백업
- `.env` 파일 별도 보관
- nginx 설정 백업
- PM2 설정 백업

### 업데이트 절차

1. **백업 생성**
```bash
# 코드 백업
git add .
git commit -m "Pre-update backup"
git push

# DB 백업
mysqldump -h 118.45.181.229 -u root -p mysolar > backup_pre_update.sql
```

2. **업데이트 적용**
```bash
# 코드 업데이트
git pull origin main

# 의존성 업데이트
npm install

# 빌드
npm run build

# 앱 재시작
pm2 restart mysolar-reports
```

3. **검증**
- 웹 인터페이스 접속 확인
- API 응답 확인
- 로그 오류 확인

---

## 부록

### 환경 변수 참조
| 변수명 | 설명 | 예시값 |
|--------|------|--------|
| MARIADB_HOST | DB 서버 주소 | 118.45.181.229 |
| MARIADB_PORT | DB 포트 | 3306 |
| MARIADB_USER | DB 사용자 | root |
| MARIADB_PASSWORD | DB 비밀번호 | [암호화됨] |
| MARIADB_DATABASE | DB 이름 | mysolar |
| NEXT_PUBLIC_DEVICE_ID | 디바이스 ID | solar_system_001 |

### 포트 사용
| 포트 | 서비스 |
|------|--------|
| 3001 | Next.js 개발 서버 |
| 3001 | Next.js 프로덕션 서버 |
| 3306 | MariaDB |

### 디렉토리 구조
```
reports-system/
├── app/                    # Next.js 앱 디렉토리
│   ├── api/               # API 라우트
│   │   └── reports/       # 리포트 API
│   ├── layout.tsx         # 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   └── reports/          # 리포트 컴포넌트
├── lib/                   # 유틸리티 라이브러리
│   └── db.ts             # DB 연결
├── public/               # 정적 파일
├── .env                  # 환경 변수
├── next.config.ts        # Next.js 설정
├── package.json          # 프로젝트 메타데이터
└── tailwind.config.ts    # Tailwind 설정
```

