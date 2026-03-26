# Giventech Reports

태양광 에너지 모니터링 시스템의 리포트 및 탄소 절감량 대시보드

## 버전 정보
- **현재 버전**: v1.2.0
- **업데이트 날짜**: 

## 프로젝트 개요

Giventech Reports는 MariaDB 데이터베이스에서 태양광 발전 데이터를 조회하여 실시간 리포트와 탄소 절감량을 시각화하는 독립형 Next.js 애플리케이션입니다.

### 주요 기능
- 실시간 태양광 발전량 모니터링
- 탄소 절감량 계산 및 환경 효과 표시
- 일별/주별/월별/연도별 데이터 차트
- 관리자 시스템
  - 일별/월별/연간 데이터 마감 관리
  - 비밀번호 변경 (bcrypt 해시)
  - 한국어 관리자 인터페이스
  - 역할 기반 접근 제어 (RBAC)
- 환경 지표 (나무 심기, 자동차 운행 중단 등가량)

## 빠른 시작

### 사전 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn
- MariaDB 접근 권한

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/utonics/giventech-reports.git
cd giventech-reports

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 연결 정보 입력

# 개발 서버 실행
npm run dev
```

http://localhost:3001 에서 애플리케이션에 접근할 수 있습니다.

## 시스템 아키텍처

```
MariaDB (mysolar) → Next.js API Routes → React Components → User Interface
         ↓                    ↓                   ↓              ↓
   [raw_inverter_data]  [데이터 처리]      [차트 렌더링]    [대시보드]
```

## 기술 스택

- **Frontend**: Next.js 15.5.9, React 19.1.0, TypeScript
- **차트**: Recharts
- **스타일링**: Tailwind CSS
- **데이터베이스**: MariaDB
- **API**: Next.js API Routes

## 프로젝트 구조

```
giventech-reports/
├── app/                    # Next.js 앱 디렉토리
│   ├── admin/              # 관리자 페이지
│   │   ├── daily-closing/  # 일별 마감
│   │   ├── monthly-closing/# 월별 마감
│   │   ├── yearly-closing/ # 연간 마감
│   │   └── settings/       # 시스템 설정
│   ├── api/                # API 라우트
│   │   ├── auth/           # 인증 API
│   │   └── reports/        # 리포트 API
│   ├── layout.tsx          # 레이아웃
│   └── page.tsx            # 메인 페이지
├── components/             # React 컴포넌트
│   └── reports/            # 리포트 컴포넌트
├── config/                 # 설정 파일
├── data/                   # 데이터 파일
│   └── users.json          # 사용자 정보
├── database/               # 데이터베이스 관련
├── docs/                   # 문서
│   ├── API_DOCUMENTATION.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── PROJECT_DOCUMENTATION.md
├── lib/                    # 유틸리티 라이브러리
│   └── db.ts               # DB 연결
├── public/                 # 정적 파일
├── scripts/                # 스크립트 파일
│   ├── create-users-table.sql
│   ├── setup-auth-db.js
│   └── test-db-connection.js
├── types/                  # TypeScript 타입 정의
├── .env                    # 환경 변수
├── CLAUDE.md               # Claude Code 가이드
├── next.config.ts          # Next.js 설정
├── package.json            # 프로젝트 메타데이터
└── tailwind.config.js      # Tailwind 설정
```

## 문서

- [프로젝트 상세 문서](./docs/PROJECT_DOCUMENTATION.md)
- [시스템 아키텍처](./docs/ARCHITECTURE.md)
- [API 문서](./docs/API_DOCUMENTATION.md)
- [배포 가이드](./docs/DEPLOYMENT_GUIDE.md)

## API 엔드포인트

### 리포트 API
| 엔드포인트 | 설명 |
|-----------|------|
| `/api/reports/carbon` | 탄소 절감량 종합 데이터 |
| `/api/reports/daily` | 일별 시간대별 데이터 |
| `/api/reports/weekly` | 주간 일별 트렌드 |
| `/api/reports/monthly` | 월별 데이터 |
| `/api/reports/yearly` | 연도별 비교 |
| `/api/reports/comprehensive` | 전체 기간 통계 |
| `/api/reports/daily-closing` | 일별 데이터 마감 |
| `/api/reports/monthly-closing` | 월별 데이터 마감 |
| `/api/reports/yearly-closing` | 연간 데이터 마감 |

### 인증 API
| 엔드포인트 | 설명 |
|-----------|------|
| `/api/auth/login` | 사용자 로그인 |
| `/api/auth/logout` | 로그아웃 |
| `/api/auth/signup` | 회원가입 |
| `/api/auth/change-password` | 비밀번호 변경 |
| `/api/auth/me` | 현재 사용자 정보 조회 |

## 주요 계산식

### 탄소 배출 절감량
- **배출 계수**: 0.4781 kg CO₂/kWh
- **계산식**: `(발전량(W) / 1000) × (1/120시간) × 0.4781`

### 환경 효과 등가 계산
- **나무 심기**: `탄소절감량(kg) / 21` (나무 1그루 = 연간 21kg CO₂ 흡수)
- **자동차 운행 중단**: `탄소절감량(kg) / 4600` (자동차 1대 = 연간 4,600kg CO₂ 배출)
- **가정 전력 공급**: `탄소절감량(kg) / 11` (가정 1일 = 11kg CO₂)

## 환경 변수

`.env` 파일에 다음 환경 변수를 설정하세요:

```env
# MariaDB 연결 설정
MARIADB_HOST=your-db-host
MARIADB_PORT=3306
MARIADB_USER=your-db-user
MARIADB_PASSWORD=your-db-password
MARIADB_DATABASE=mysolar

# 디바이스 ID
NEXT_PUBLIC_DEVICE_ID=solar_system_001

# JWT 시크릿 키 (프로덕션에서는 변경 필수)
JWT_SECRET=your-secret-key-here
```

## 배포

### Vercel 배포 (권장)

#### GitHub 연동
1. [Vercel](https://vercel.com)에 GitHub 계정으로 로그인
2. "Import Project" 클릭 후 이 저장소 선택
3. 환경 변수를 Vercel 대시보드에 설정
4. "Deploy" 클릭

#### Vercel CLI
```bash
npm i -g vercel
vercel
```

자세한 배포 가이드는 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)를 참조하세요.

### 로컬 프로덕션 빌드
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t giventech-reports .
docker run -p 3001:3001 giventech-reports
```

## 개발 명령어

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버
npm start

# 린트
npm run lint
```

## 업데이트 이력

### v1.2.0 (2025.01)
- 역할 기반 접근 제어 (RBAC) 구현
- 관리자/일반 사용자 권한 분리
- 관리자 페이지 접근 보호

### v1.1.0 (2025.01)
- 관리자 시스템 완성
- 일별/월별/연간 마감 기능
- 비밀번호 변경 기능

### v1.0.0 (2024.12)
- 초기 버전 릴리즈

