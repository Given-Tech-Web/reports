# MySolar Reports System - 배포 가이드

## 목차
1. [개발 환경 설정](#개발-환경-설정)
2. [프로덕션 배포](#프로덕션-배포)
3. [Docker 배포](#docker-배포)
4. [PM2 프로세스 관리](#pm2-프로세스-관리)
5. [Nginx 설정](#nginx-설정)
6. [모니터링 및 유지보수](#모니터링-및-유지보수)
7. [문제 해결](#문제-해결)

---

## 개발 환경 설정

### 1. 사전 요구사항

#### 시스템 요구사항
- **Node.js**: 18.0.0 이상
- **npm**: 9.0.0 이상
- **메모리**: 최소 2GB RAM
- **디스크**: 최소 1GB 여유 공간

#### 필수 도구
```bash
# Node.js 버전 확인
node --version  # v18.0.0 이상

# npm 버전 확인
npm --version   # 9.0.0 이상

# Git 설치 확인
git --version
```

### 2. 프로젝트 설정

#### 저장소 클론
```bash
# HTTPS
git clone https://github.com/your-org/mysolar-reports-system.git

# SSH
git clone git@github.com:your-org/mysolar-reports-system.git

# 디렉토리 이동
cd mysolar-reports-system
```

#### 의존성 설치
```bash
# 프로덕션 + 개발 의존성 설치
npm install

# 프로덕션 의존성만 설치
npm install --production
```

### 3. 환경 변수 설정

#### .env 파일 생성
```bash
# .env 파일 생성
cp .env.example .env

# 또는 직접 생성
touch .env
```

#### 환경 변수 내용
```env
# Database Configuration
MARIADB_HOST=----
MARIADB_PORT=3306
MARIADB_USER=root
MARIADB_PASSWORD=----
MARIADB_DATABASE=----

# Application Configuration
NEXT_PUBLIC_DEVICE_ID=solar_system_001
NODE_ENV=development
PORT=3001

# Optional: API Configuration
API_TIMEOUT=30000
MAX_CONNECTIONS=10
```

### 4. 개발 서버 실행

```bash
# 개발 서버 시작 (핫 리로드 지원)
npm run dev

# 특정 포트로 실행
PORT=3002 npm run dev

# 디버그 모드
DEBUG=* npm run dev
```

### 5. 개발 도구

#### 코드 품질 검사
```bash
# ESLint 실행
npm run lint

# ESLint 자동 수정
npm run lint:fix

# TypeScript 타입 체크
npm run type-check
```

#### 테스트 (개발 중)
```bash
# 단위 테스트
npm test

# 테스트 커버리지
npm run test:coverage

# E2E 테스트
npm run test:e2e
```

---

## 프로덕션 배포

### 1. 프로덕션 빌드

```bash
# 프로덕션 빌드 생성
npm run build

# 빌드 결과 확인
ls -la .next/
```

### 2. 프로덕션 환경 변수

#### .env.production 파일
```env
# Database Configuration (Production)
MARIADB_HOST=production-db.example.com
MARIADB_PORT=3306
MARIADB_USER=mysolar_app
MARIADB_PASSWORD=${SECURE_PASSWORD}
MARIADB_DATABASE=mysolar_production

# Application Configuration
NEXT_PUBLIC_DEVICE_ID=solar_system_001
NODE_ENV=production
PORT=3001

# Security
NEXT_PUBLIC_API_URL=https://api.mysolar.com
```

### 3. 프로덕션 서버 시작

```bash
# 프로덕션 서버 시작
npm start

# 백그라운드 실행
nohup npm start &

# 특정 포트로 실행
PORT=8080 npm start
```

---

## Docker 배포

### 1. Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT 3001

CMD ["node", "server.js"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MARIADB_HOST=db
      - MARIADB_PORT=3306
      - MARIADB_USER=root
      - MARIADB_PASSWORD=Qusrud8545!!@@
      - MARIADB_DATABASE=mysolar
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mariadb:11
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=Qusrud8545!!@@
      - MYSQL_DATABASE=mysolar
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:
```

### 3. Docker 명령어

```bash
# 이미지 빌드
docker build -t mysolar-reports:latest .

# 컨테이너 실행
docker run -d \
  --name mysolar-reports \
  -p 3001:3001 \
  --env-file .env.production \
  mysolar-reports:latest

# Docker Compose 실행
docker-compose up -d

# 로그 확인
docker logs -f mysolar-reports

# 컨테이너 중지
docker stop mysolar-reports

# 컨테이너 제거
docker rm mysolar-reports
```

---

## PM2 프로세스 관리

### 1. PM2 설치

```bash
# 전역 설치
npm install -g pm2

# 로컬 설치
npm install --save-dev pm2
```

### 2. PM2 설정 파일

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mysolar-reports',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 3. PM2 명령어

```bash
# 앱 시작
pm2 start ecosystem.config.js

# 프로세스 목록
pm2 list

# 프로세스 상태 확인
pm2 status

# 로그 확인
pm2 logs mysolar-reports

# 실시간 모니터링
pm2 monit

# 프로세스 재시작
pm2 restart mysolar-reports

# 프로세스 중지
pm2 stop mysolar-reports

# 프로세스 삭제
pm2 delete mysolar-reports

# PM2 저장 (재부팅 후 자동 시작)
pm2 save
pm2 startup
```

---

## Nginx 설정

### 1. Nginx 설치

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# 서비스 시작
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Nginx 설정 파일

```nginx
# /etc/nginx/sites-available/mysolar-reports
server {
    listen 80;
    server_name mysolar.example.com;

    # 리다이렉트 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mysolar.example.com;

    # SSL 인증서
    ssl_certificate /etc/letsencrypt/live/mysolar.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mysolar.example.com/privkey.pem;

    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 로그
    access_log /var/log/nginx/mysolar-reports-access.log;
    error_log /var/log/nginx/mysolar-reports-error.log;

    # 프록시 설정
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 정적 파일 캐싱
    location /_next/static {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Nginx 활성화

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/mysolar-reports /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx
```

---

## 모니터링 및 유지보수

### 1. 헬스 체크

```bash
# API 헬스 체크
curl http://localhost:3001/api/health

# 프로세스 확인
ps aux | grep node

# 포트 확인
netstat -tulpn | grep 3001
```

### 2. 로그 관리

```bash
# PM2 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 로그 위치
/var/log/nginx/         # Nginx 로그
./logs/                 # PM2 로그
./.next/               # Next.js 빌드 로그
```

### 3. 백업

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mysolar-reports"

# 코드 백업
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /app/mysolar-reports

# 환경 설정 백업
cp /app/mysolar-reports/.env $BACKUP_DIR/env_$DATE

# 데이터베이스 백업
mysqldump -h 118.45.181.229 -u root -p mysolar > $BACKUP_DIR/db_$DATE.sql

# 오래된 백업 삭제 (30일 이상)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 4. 모니터링 도구

```bash
# htop 설치 및 실행
sudo apt install htop
htop

# 디스크 사용량
df -h

# 메모리 사용량
free -m

# CPU 사용률
top

# 네트워크 모니터링
iftop
```

---

## 문제 해결

### 1. 일반적인 문제

#### 포트 충돌
```bash
# 포트 사용 확인
lsof -i :3001

# 프로세스 종료
kill -9 [PID]
```

#### 메모리 부족
```bash
# 메모리 확인
free -m

# PM2 메모리 제한 설정
pm2 start app.js --max-memory-restart 1G

# Node.js 메모리 증가
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### 캐시 문제
```bash
# Next.js 캐시 삭제
rm -rf .next
npm run build

# npm 캐시 정리
npm cache clean --force
```

### 2. 데이터베이스 연결 문제

```bash
# 연결 테스트
mysql -h 118.45.181.229 -u root -p -e "SELECT 1"

# 방화벽 확인
telnet 118.45.181.229 3306

# 연결 수 확인
mysql -e "SHOW PROCESSLIST"
```

### 3. 배포 실패

```bash
# 빌드 로그 확인
cat .next/build-manifest.json

# 의존성 확인
npm ls

# Node.js 버전 확인
node --version

# 환경 변수 확인
printenv | grep MARIADB
```

### 4. 성능 문제

```bash
# PM2 클러스터 모드 활성화
pm2 start app.js -i max

# Nginx 캐싱 활성화
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

# 데이터베이스 쿼리 최적화
EXPLAIN SELECT * FROM raw_inverter_data;
```

---

## 보안 체크리스트

### 프로덕션 배포 전 확인사항

- [ ] 환경 변수 보안 설정
- [ ] HTTPS 인증서 설치
- [ ] 방화벽 규칙 설정
- [ ] 보안 헤더 구성
- [ ] Rate Limiting 설정
- [ ] 로그 수집 설정
- [ ] 백업 전략 수립
- [ ] 모니터링 도구 설치
- [ ] 에러 알림 설정
- [ ] 롤백 계획 수립

---
