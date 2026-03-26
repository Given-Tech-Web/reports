# MySolar Reports System - Vercel 배포 가이드

## 📋 배포 전 체크리스트

- [x] GitHub 저장소 준비 완료 (`utonics/mysolar-reports-system`)
- [x] package.json 포트 설정 제거
- [x] vercel.json 설정 파일 생성
- [x] .gitignore에 환경 변수 파일 포함
- [ ] Vercel 계정 생성 (없는 경우)
- [ ] 데이터베이스 접근 권한 확인

## 🚀 Vercel 배포 방법

### 방법 1: GitHub 연동을 통한 배포 (권장)

1. **Vercel 접속 및 로그인**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 가져오기**
   - Dashboard에서 "Add New..." → "Project" 클릭
   - "Import Git Repository" 선택
   - GitHub 저장소 `utonics/mysolar-reports-system` 선택

3. **프로젝트 설정**
   - **Framework Preset**: Next.js (자동 감지됨)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. **환경 변수 설정** ⚠️ 중요

   Vercel 대시보드의 "Environment Variables" 섹션에 다음 변수들을 추가:

   ```
   MARIADB_HOST=118.45.181.229
   MARIADB_PORT=3306
   MARIADB_USER=root
   MARIADB_PASSWORD=Qusrud8545!!@@
   MARIADB_DATABASE=mysolar
   NEXT_PUBLIC_DEVICE_ID=solar_system_001
   NEXT_PUBLIC_APP_NAME=MySolar Reports System
   ```

5. **Deploy 클릭**
   - 배포가 자동으로 시작됩니다
   - 약 2-3분 후 배포 완료

### 방법 2: Vercel CLI를 통한 배포

1. **Vercel CLI 설치**
   ```bash
   npm i -g vercel
   ```

2. **프로젝트 디렉토리에서 실행**
   ```bash
   cd mysolar-reports-system
   vercel
   ```

3. **프롬프트에 따라 설정**
   - Set up and deploy? `Y`
   - Which scope? (본인 계정 선택)
   - Link to existing project? `N`
   - Project name? `mysolar-reports-system`
   - Directory? `./`
   - Want to override settings? `N`

4. **환경 변수 추가**
   ```bash
   vercel env add MARIADB_HOST
   vercel env add MARIADB_PORT
   vercel env add MARIADB_USER
   vercel env add MARIADB_PASSWORD
   vercel env add MARIADB_DATABASE
   vercel env add NEXT_PUBLIC_DEVICE_ID
   ```

5. **프로덕션 배포**
   ```bash
   vercel --prod
   ```

## 🔐 보안 고려사항

### 데이터베이스 접근
- MariaDB 서버(118.45.181.229)의 방화벽 설정 확인 필요
- Vercel의 IP 대역 허용 필요할 수 있음
- 보안을 위해 읽기 전용 DB 사용자 생성 권장

### 환경 변수
- 민감한 정보는 절대 코드에 하드코딩하지 않음
- Vercel 대시보드에서만 환경 변수 관리
- 프로덕션과 개발 환경 변수 분리

## 🌐 배포 후 설정

### 도메인 설정
1. Vercel 대시보드 → Settings → Domains
2. 기본 도메인: `mysolar-reports-system.vercel.app`
3. 커스텀 도메인 추가 가능

### 자동 배포 설정
- GitHub master 브랜치 푸시 시 자동 배포
- Pull Request 생성 시 Preview 배포
- 브랜치별 배포 환경 분리 가능

### 모니터링
- Vercel Analytics 활성화 (Settings → Analytics)
- 실시간 로그 확인 (Functions → Logs)
- 성능 메트릭 모니터링

## 📊 성능 최적화

### 리전 설정
- `vercel.json`에서 `"regions": ["icn1"]` 설정
- 한국 사용자를 위해 서울 리전(icn1) 사용

### 캐싱 설정
- 정적 자산 자동 캐싱
- API 응답 캐싱 고려

## 🔧 문제 해결

### 빌드 실패
- TypeScript 에러 확인
- 환경 변수 누락 확인
- node_modules 재설치: `npm ci`

### 데이터베이스 연결 실패
- 환경 변수 올바르게 설정되었는지 확인
- DB 서버 방화벽 설정 확인
- Vercel Functions 로그 확인

### 배포 URL
배포 완료 후 다음 URL로 접근:
- 프로덕션: `https://mysolar-reports-system.vercel.app`
- 개발: `https://mysolar-reports-system-[branch].vercel.app`

## 📞 지원

문제 발생 시:
1. Vercel 대시보드의 Function Logs 확인
2. GitHub Issues에 문제 보고
3. Vercel Support 문의

---

최종 업데이트: 2025년 9월 22일