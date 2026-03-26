# Comprehensive API 수정 보고서

**수정 일시**: 2025-10-01
**문제**: All Time 그래프가 Yearly Performance보다 작은 값 표시

---

## 🐛 문제 분석

### 발견된 문제
- **Yearly Performance API**: 1,757.18 kWh (2025년, `monthly_inverter_stats` 사용)
- **All Time API**: 111.95 kWh (전체, `raw_inverter_data`만 사용)
- **불일치**: All Time이 단일 연도보다 작은 값 표시 ❌

### 근본 원인
`/api/reports/comprehensive` API가 `raw_inverter_data`만 사용:
```typescript
// 기존 코드 (문제)
const yearlyQuery = `
  SELECT
    YEAR(timestamp) as year,
    SUM(pv1_charging_power / 1000 * (1/120)) as total_solar_kwh,
    ...
  FROM raw_inverter_data  ← 원시 데이터만 사용
  WHERE device_id = ?
  GROUP BY YEAR(timestamp)
`;
```

**문제점**:
- 월별/일별 마감 데이터를 무시
- `monthly_inverter_stats`의 정확한 마감 데이터를 사용하지 않음
- 데이터 소스 불일치로 인한 부정확한 합계

---

## ✅ 구현된 해결방안

### 데이터 소스 우선순위 변경

**수정 전**:
```
raw_inverter_data만 사용
```

**수정 후**:
```
1순위: monthly_inverter_stats (월별 마감 데이터) ← NEW
2순위: daily_inverter_stats (일별 마감 집계)
3순위: raw_inverter_data (원시 데이터)
```

### 수정된 코드 (`app/api/reports/comprehensive/route.ts`)

```typescript
// 1순위: monthly_inverter_stats에서 시도
let yearlyQuery = `
  SELECT
    year,
    SUM(total_energy_generated) as total_solar_kwh,
    SUM(total_carbon_reduction) as carbon_reduction,
    AVG(avg_battery_capacity) as avg_battery_capacity,
    MAX(max_pv1_charging_power) as peak_power,
    SUM(days_operated) as records_count
  FROM monthly_inverter_stats
  WHERE device_id = ?
  GROUP BY year
  ORDER BY year
`;

let [yearlyRows] = await connection.execute(yearlyQuery, [deviceId]);

// 2순위: daily_inverter_stats
if (!yearlyRows || yearlyRows.length === 0) {
  yearlyQuery = `
    SELECT
      YEAR(date) as year,
      SUM(total_energy_generated) as total_solar_kwh,
      ...
    FROM daily_inverter_stats
    WHERE device_id = ?
    GROUP BY YEAR(date)
  `;
  [yearlyRows] = await connection.execute(yearlyQuery, [deviceId]);
}

// 3순위: raw_inverter_data
if (!yearlyRows || yearlyRows.length === 0) {
  yearlyQuery = `
    SELECT
      YEAR(timestamp) as year,
      SUM(pv1_charging_power / 1000 * (1/120)) as total_solar_kwh,
      ...
    FROM raw_inverter_data
    WHERE device_id = ?
    GROUP BY YEAR(timestamp)
  `;
  [yearlyRows] = await connection.execute(yearlyQuery, [deviceId]);
}

// Totals 계산 (연도별 데이터 합산)
const totals = {
  total_solar_kwh: yearlyData.reduce((sum, row) => sum + parseFloat(row.total_solar_kwh), 0),
  total_carbon_reduction: yearlyData.reduce((sum, row) => sum + parseFloat(row.carbon_reduction), 0),
  total_records: yearlyData.reduce((sum, row) => sum + row.records_count, 0),
  peak_power_ever: Math.max(...yearlyData.map(row => row.peak_power))
};
```

---

## 📊 검증 결과

### 수정 전
```json
{
  "yearly_data": [
    {
      "year": 2025,
      "total_solar_kwh": 111.95  ← 원시 데이터만 (불완전)
    }
  ],
  "totals": {
    "total_solar_kwh": 111.95  ← 잘못된 합계
  }
}
```

### 수정 후
```json
{
  "yearly_data": [
    {
      "year": 2024,
      "total_solar_kwh": 1194.07  ← 월별 마감 데이터
    },
    {
      "year": 2025,
      "total_solar_kwh": 1757.18  ← 월별 마감 데이터
    }
  ],
  "totals": {
    "total_solar_kwh": 2951.24,  ← 정확한 합계 ✅
    "total_carbon_reduction": 1410.99,
    "peak_power_ever": 32760
  }
}
```

### 데이터 일관성 검증

| API | 2024년 | 2025년 | 합계 | 데이터 소스 |
|-----|--------|--------|------|-------------|
| **Yearly** | 1,194.07 | 1,757.18 | N/A | `monthly_inverter_stats` |
| **Comprehensive** | 1,194.07 | 1,757.18 | **2,951.24** | `monthly_inverter_stats` |
| **일치 여부** | ✅ | ✅ | ✅ | ✅ |

---

## 🎯 개선 효과

### Before (수정 전)
- ❌ All Time이 Yearly보다 작은 값 표시
- ❌ 데이터 소스 불일치
- ❌ 원시 데이터만 사용하여 부정확

### After (수정 후)
- ✅ All Time이 모든 연도의 정확한 합계 표시
- ✅ 모든 보고서 API가 동일한 데이터 소스 사용
- ✅ 월별 마감 데이터를 우선 사용하여 정확성 보장

---

## 📈 전체 시스템 데이터 흐름

```
Raw Data (raw_inverter_data)
    ↓ 일별 마감
Daily Stats (daily_inverter_stats)
    ↓ 월별 마감
Monthly Stats (monthly_inverter_stats)
    ↓ ↓ ↓
    ↓ ↓ └─→ /api/reports/monthly (월별 보고서)
    ↓ └───→ /api/reports/yearly (연간 보고서)
    └─────→ /api/reports/comprehensive (종합 보고서) ← NEW
```

**모든 보고서 API가 이제 `monthly_inverter_stats`를 우선 사용합니다!**

---

## 🔧 수정 파일

- ✅ `app/api/reports/comprehensive/route.ts` - 데이터 소스 우선순위 변경
- ✅ `app/api/reports/yearly/route.ts` - 이전에 수정 완료
- ✅ `app/api/reports/monthly/route.ts` - 이전에 수정 완료

---

## ✨ 최종 결론

**All Time 그래프가 이제 Yearly Performance와 일관성 있는 데이터를 표시합니다.**

- 2024년: 1,194.07 kWh
- 2025년: 1,757.18 kWh
- **전체 합계: 2,951.24 kWh** ✅

**모든 보고서 API가 월별 마감 데이터를 사용하여 정확하고 일관된 데이터를 제공합니다!**

---

**수정 완료**: 2025-10-01
**결과**: ✅ **All Time 그래프 문제 해결**
