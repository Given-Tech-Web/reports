# MySolar Reports System - API 문서

## API 개요

MySolar Reports System API는 태양광 발전 데이터와 탄소 절감량 정보를 제공하는 RESTful API입니다.

### 기본 정보
- **Base URL**: `http://localhost:3001/api` (개발)
- **프로토콜**: HTTP/HTTPS
- **응답 형식**: JSON
- **인증**: 없음 (개발 중)
- **Rate Limiting**: 없음 (개발 중)

## 엔드포인트 목록

| 엔드포인트 | 메소드 | 설명 |
|-----------|--------|------|
| `/api/reports/carbon` | GET | 탄소 절감량 종합 데이터 |
| `/api/reports/daily` | GET | 일별 시간대별 데이터 |
| `/api/reports/weekly` | GET | 주간 일별 트렌드 |
| `/api/reports/monthly` | GET | 월별 데이터 |
| `/api/reports/yearly` | GET | 연도별 비교 |
| `/api/reports/comprehensive` | GET | 전체 기간 통계 |
| `/api/reports/available-years` | GET | 데이터 존재 연도 |

---

## 상세 API 문서

### 1. 탄소 절감량 조회

#### `GET /api/reports/carbon`

탄소 절감량 종합 데이터와 환경 영향 등가 지표를 반환합니다.

**Request**
```http
GET /api/reports/carbon HTTP/1.1
Host: localhost:3001
```

**Response**
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

**Response Fields**
| 필드 | 타입 | 설명 |
|------|------|------|
| `totalCarbon` | number | 전체 누적 탄소 절감량 (kg CO₂) |
| `today` | number | 오늘 탄소 절감량 (kg CO₂) |
| `thisWeek` | number | 이번 주 탄소 절감량 (kg CO₂) |
| `thisMonth` | number | 이번 달 탄소 절감량 (kg CO₂) |
| `thisYear` | number | 올해 탄소 절감량 (kg CO₂) |
| `equivalents.trees` | number | 나무 심기 등가량 (그루) |
| `equivalents.cars` | number | 자동차 운행 중단 등가량 (대) |
| `equivalents.households` | number | 가정 전력 공급 등가량 (일) |
| `equivalents.coal` | number | 석탄 미연소 등가량 (kg) |

**Status Codes**
- `200 OK`: 성공
- `500 Internal Server Error`: 서버 오류

---

### 2. 일별 데이터 조회

#### `GET /api/reports/daily`

최근 24시간의 시간대별 발전량 및 탄소 절감량 데이터를 반환합니다.

**Request**
```http
GET /api/reports/daily HTTP/1.1
Host: localhost:3001
```

**Response**
```json
{
  "data": [
    {
      "time": "00:00",
      "solar": 0,
      "carbon": 0
    },
    {
      "time": "01:00",
      "solar": 0,
      "carbon": 0
    },
    {
      "time": "12:00",
      "solar": 3.45,
      "carbon": 1.65
    },
    {
      "time": "13:00",
      "solar": 4.12,
      "carbon": 1.97
    }
  ],
  "summary": {
    "totalSolar": 45.67,
    "totalCarbon": 21.84,
    "peakHour": "14:00",
    "peakPower": 4.56,
    "avgHourly": 1.90
  }
}
```

**Response Fields**
| 필드 | 타입 | 설명 |
|------|------|------|
| `data` | array | 시간대별 데이터 배열 |
| `data[].time` | string | 시간 (HH:mm 형식) |
| `data[].solar` | number | 태양광 발전량 (kWh) |
| `data[].carbon` | number | 탄소 절감량 (kg CO₂) |
| `summary.totalSolar` | number | 일일 총 발전량 (kWh) |
| `summary.totalCarbon` | number | 일일 총 탄소 절감량 (kg CO₂) |
| `summary.peakHour` | string | 최대 발전 시간 |
| `summary.peakPower` | number | 최대 발전량 (kWh) |
| `summary.avgHourly` | number | 시간당 평균 발전량 (kWh) |

---

### 3. 주간 트렌드 조회

#### `GET /api/reports/weekly`

최근 7일간의 일별 발전량 및 탄소 절감량 트렌드를 반환합니다.

**Request**
```http
GET /api/reports/weekly HTTP/1.1
Host: localhost:3001
```

**Response**
```json
{
  "data": [
    {
      "date": "2025-01-13",
      "dayName": "월",
      "solar": 45.67,
      "carbon": 21.84
    },
    {
      "date": "2025-01-14",
      "dayName": "화",
      "solar": 48.23,
      "carbon": 23.06
    }
  ],
  "summary": {
    "totalSolar": 320.45,
    "totalCarbon": 153.29,
    "avgDaily": 45.78,
    "bestDay": {
      "date": "2025-01-15",
      "solar": 52.34
    },
    "worstDay": {
      "date": "2025-01-17",
      "solar": 38.12
    }
  }
}
```

**Response Fields**
| 필드 | 타입 | 설명 |
|------|------|------|
| `data` | array | 일별 데이터 배열 |
| `data[].date` | string | 날짜 (YYYY-MM-DD) |
| `data[].dayName` | string | 요일 |
| `data[].solar` | number | 일일 발전량 (kWh) |
| `data[].carbon` | number | 일일 탄소 절감량 (kg CO₂) |
| `summary.totalSolar` | number | 주간 총 발전량 (kWh) |
| `summary.totalCarbon` | number | 주간 총 탄소 절감량 (kg CO₂) |
| `summary.avgDaily` | number | 일일 평균 발전량 (kWh) |
| `summary.bestDay` | object | 최고 발전일 정보 |
| `summary.worstDay` | object | 최저 발전일 정보 |

---

### 4. 월별 데이터 조회

#### `GET /api/reports/monthly`

특정 연도의 월별 발전량 및 탄소 절감량 데이터를 반환합니다.

**Request**
```http
GET /api/reports/monthly?year=2025 HTTP/1.1
Host: localhost:3001
```

**Query Parameters**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `year` | number | 아니오 | 현재 연도 | 조회할 연도 |

**Response**
```json
{
  "data": [
    {
      "month": "1월",
      "monthNum": 1,
      "solar": 234.56,
      "carbon": 112.16
    },
    {
      "month": "2월",
      "monthNum": 2,
      "solar": 0,
      "carbon": 0
    }
  ],
  "summary": {
    "year": 2025,
    "totalSolar": 234.56,
    "totalCarbon": 112.16,
    "avgMonthly": 19.55,
    "monthsWithData": 1
  }
}
```

**Response Fields**
| 필드 | 타입 | 설명 |
|------|------|------|
| `data` | array | 월별 데이터 배열 |
| `data[].month` | string | 월 이름 |
| `data[].monthNum` | number | 월 번호 (1-12) |
| `data[].solar` | number | 월간 발전량 (kWh) |
| `data[].carbon` | number | 월간 탄소 절감량 (kg CO₂) |
| `summary.year` | number | 조회 연도 |
| `summary.totalSolar` | number | 연간 총 발전량 (kWh) |
| `summary.totalCarbon` | number | 연간 총 탄소 절감량 (kg CO₂) |
| `summary.avgMonthly` | number | 월 평균 발전량 (kWh) |
| `summary.monthsWithData` | number | 데이터가 있는 월 수 |

---

### 5. 연도별 비교

#### `GET /api/reports/yearly`

연도별 발전량 및 탄소 절감량 비교 데이터를 반환합니다.

**Request**
```http
GET /api/reports/yearly HTTP/1.1
Host: localhost:3001
```

**Response**
```json
{
  "data": [
    {
      "year": 2024,
      "solar": 4567.89,
      "carbon": 2184.56,
      "months": 12
    },
    {
      "year": 2025,
      "solar": 234.56,
      "carbon": 112.16,
      "months": 1
    }
  ],
  "summary": {
    "totalYears": 2,
    "totalSolar": 4802.45,
    "totalCarbon": 2296.72,
    "bestYear": {
      "year": 2024,
      "solar": 4567.89
    },
    "avgYearly": 2401.23
  }
}
```

**Response Fields**
| 필드 | 타입 | 설명 |
|------|------|------|
| `data` | array | 연도별 데이터 배열 |
| `data[].year` | number | 연도 |
| `data[].solar` | number | 연간 발전량 (kWh) |
| `data[].carbon` | number | 연간 탄소 절감량 (kg CO₂) |
| `data[].months` | number | 데이터가 있는 월 수 |
| `summary.totalYears` | number | 총 연도 수 |
| `summary.totalSolar` | number | 전체 발전량 (kWh) |
| `summary.totalCarbon` | number | 전체 탄소 절감량 (kg CO₂) |
| `summary.bestYear` | object | 최고 발전 연도 |
| `summary.avgYearly` | number | 연평균 발전량 (kWh) |

---

### 6. 종합 통계

#### `GET /api/reports/comprehensive`

전체 기간의 종합 통계 데이터를 반환합니다.

**Request**
```http
GET /api/reports/comprehensive HTTP/1.1
Host: localhost:3001
```

**Response**
```json
{
  "lifetime": {
    "solar": 4802.45,
    "carbon": 2296.72,
    "days": 397,
    "avgDaily": 12.10,
    "startDate": "2024-01-01",
    "endDate": "2025-01-19"
  },
  "currentYear": {
    "year": 2025,
    "solar": 234.56,
    "carbon": 112.16,
    "days": 19,
    "avgDaily": 12.35
  },
  "lastYear": {
    "year": 2024,
    "solar": 4567.89,
    "carbon": 2184.56,
    "days": 366,
    "avgDaily": 12.48
  },
  "bestPerformance": {
    "bestDay": {
      "date": "2024-06-15",
      "solar": 56.78,
      "carbon": 27.14
    },
    "bestMonth": {
      "month": "2024-06",
      "solar": 678.90,
      "carbon": 324.55
    },
    "bestYear": {
      "year": 2024,
      "solar": 4567.89,
      "carbon": 2184.56
    }
  }
}
```

**Response Fields**
| 필드 | 타입 | 설명 |
|------|------|------|
| `lifetime` | object | 전체 기간 통계 |
| `lifetime.solar` | number | 누적 발전량 (kWh) |
| `lifetime.carbon` | number | 누적 탄소 절감량 (kg CO₂) |
| `lifetime.days` | number | 운영 일수 |
| `lifetime.avgDaily` | number | 일평균 발전량 (kWh) |
| `lifetime.startDate` | string | 데이터 시작일 |
| `lifetime.endDate` | string | 데이터 종료일 |
| `currentYear` | object | 현재 연도 통계 |
| `lastYear` | object | 작년 통계 |
| `bestPerformance` | object | 최고 성능 기록 |

---

### 7. 데이터 존재 연도

#### `GET /api/reports/available-years`

데이터가 존재하는 연도 목록을 반환합니다.

**Request**
```http
GET /api/reports/available-years HTTP/1.1
Host: localhost:3001
```

**Response**
```json
{
  "years": [2024, 2025],
  "count": 2,
  "range": {
    "start": 2024,
    "end": 2025
  }
}
```

**Response Fields**
| 필드 | 타입 | 설명 |
|------|------|------|
| `years` | array | 데이터 존재 연도 배열 |
| `count` | number | 총 연도 수 |
| `range.start` | number | 시작 연도 |
| `range.end` | number | 종료 연도 |

---

## 에러 응답

모든 API는 에러 발생 시 일관된 형식으로 응답합니다.

### 에러 응답 형식
```json
{
  "error": true,
  "message": "에러 메시지",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 에러 코드
| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| `DB_CONNECTION_ERROR` | 500 | 데이터베이스 연결 실패 |
| `QUERY_ERROR` | 500 | 쿼리 실행 오류 |
| `INVALID_PARAMETER` | 400 | 잘못된 파라미터 |
| `NOT_FOUND` | 404 | 데이터 없음 |
| `INTERNAL_ERROR` | 500 | 내부 서버 오류 |

---

## Mock 데이터

데이터베이스 연결 실패 시 개발을 위한 Mock 데이터가 반환됩니다.

### Mock 데이터 특징
- 실제 데이터와 동일한 구조
- 현실적인 값 범위
- 일관된 시간대별/일별 패턴
- 개발 및 테스트 용도로만 사용

### Mock 데이터 식별
응답 헤더에 `X-Data-Source: mock` 포함 (개발 중)

---

## 데이터 계산 로직

### 탄소 절감량 계산
```javascript
// 탄소 배출 계수: 0.4781 kg CO₂/kWh
carbonReduction = solarGeneration * 0.4781
```

### 환경 등가 계산
```javascript
// 나무 심기: 나무 1그루 = 연간 21kg CO₂ 흡수
trees = Math.floor(carbonReduction / 21)

// 자동차: 자동차 1대 = 연간 4,600kg CO₂ 배출
cars = carbonReduction / 4600

// 가정: 가정 1일 = 11kg CO₂
households = Math.floor(carbonReduction / 11)

// 석탄: 석탄 1kg = 0.89kg CO₂
coal = Math.floor(carbonReduction / 0.89)
```

### 데이터 집계
- **시간별**: 30초 데이터를 시간 단위로 집계
- **일별**: 시간별 데이터를 일 단위로 집계
- **월별**: 일별 데이터를 월 단위로 집계
- **연도별**: 월별 데이터를 연도 단위로 집계

---

## 성능 고려사항

### 응답 시간
- 목표: < 200ms
- 현재: 평균 150ms (로컬 환경)

### 쿼리 최적화
- 인덱스 활용
- 필요한 필드만 SELECT
- 집계 함수 활용

### 캐싱 전략 (개발 중)
- 정적 데이터: 1시간
- 동적 데이터: 5분
- 실시간 데이터: 캐싱 없음

---

## 향후 개발 계획

### v2.0 계획
- GraphQL API 지원
- WebSocket 실시간 업데이트
- 사용자 인증 및 권한 관리
- Rate Limiting
- API 버저닝

### v3.0 계획
- 예측 분석 API
- 비용 분석 API
- 알림 API
- 데이터 내보내기 API

---

## API 테스트

### cURL 예시
```bash
# 탄소 절감량 조회
curl http://localhost:3001/api/reports/carbon

# 일별 데이터 조회
curl http://localhost:3001/api/reports/daily

# 월별 데이터 조회 (2025년)
curl "http://localhost:3001/api/reports/monthly?year=2025"
```

### Postman Collection
Postman Collection 파일은 `/docs/postman/` 디렉토리에서 확인 가능 (개발 중)

---

최종 업데이트: 2025년 1월 19일