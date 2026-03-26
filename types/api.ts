// API Request and Response Type Definitions

export interface ApiError {
  error: string;
  details?: string;
  device_id?: string;
  timestamp?: string;
}

// Carbon Report Types
export interface CarbonDataPoint {
  date: string;
  carbon_saved_kg: number;
  solar_generated_kwh: number;
  avg_battery: number;
}

export interface CarbonSummary {
  total_carbon_saved_kg: number;
  total_solar_generated_kwh: number;
  avg_daily_carbon: number;
  avg_daily_solar: number;
}

export interface CarbonEquivalents {
  trees_planted: number;
  cars_off_road: string;
  households_powered: string;
  coal_not_burned: string;
}

export interface CarbonReportResponse {
  period: 'day' | 'week' | 'month' | 'year' | 'total';
  data?: CarbonDataPoint[];
  summary?: CarbonSummary;
  total_carbon_saved_kg?: number;
  total_solar_generated_kwh?: number;
  avg_battery_capacity?: number;
  first_record?: Date;
  last_record?: Date;
  total_records?: number;
  equivalents: CarbonEquivalents;
}

// Daily Report Types
export interface DailyDataPoint {
  hour: number;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
  data_points: number;
}

export interface DailyReportResponse {
  device_id: string;
  report_date: string;
  daily_data: DailyDataPoint[];
  daily_summary: {
    total_solar_kwh: number;
    total_carbon_reduction: number;
    avg_battery_capacity: number;
    peak_power: number;
    total_data_points: number;
  };
}

// Weekly Report Types
export interface WeeklyDataPoint {
  date: string;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
}

export interface WeeklyReportResponse {
  device_id: string;
  start_date: string;
  end_date: string;
  daily_data: WeeklyDataPoint[];
  weekly_summary: {
    total_solar_kwh: number;
    total_carbon_reduction: number;
    avg_battery_capacity: number;
    peak_power: number;
    days_with_data: number;
  };
}

// Monthly Report Types
export interface MonthlyDataPoint {
  month: string;
  month_name: string;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
  generator_hours: number;
}

export interface MonthlyReportResponse {
  device_id: string;
  year: number;
  monthly_data: MonthlyDataPoint[];
  yearly_summary: {
    total_solar_kwh: number;
    total_carbon_reduction: number;
    avg_battery_capacity: number;
    peak_power: number;
    total_generator_hours: number;
    months_with_data: number;
  };
}

// Yearly Report Types
export interface YearlyDataPoint {
  year: number;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
  records_count: number;
}

export interface YearlyReportResponse {
  device_id: string;
  yearly_data: YearlyDataPoint[];
  all_time_summary: {
    total_solar_kwh: number;
    total_carbon_reduction: number;
    avg_battery_capacity: number;
    peak_power: number;
    years_with_data: number;
    total_records: number;
  };
}

// Comprehensive Report Types
export interface ComprehensiveTotals {
  first_record_date: Date | null;
  last_record_date: Date | null;
  total_solar_kwh: number;
  total_carbon_reduction: number;
  total_records: number;
  peak_power_ever: number;
}

export interface ComprehensiveReportResponse {
  device_id: string;
  yearly_data: YearlyDataPoint[];
  totals: ComprehensiveTotals;
}

// Available Years Types
export interface AvailableYearsResponse {
  device_id: string;
  years: number[];
  current_year: number;
  total_years: number;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export interface SignupRequest {
  username: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface SignupResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// User Session Type
export interface UserSession {
  id: number;
  username: string;
  role: string;
  exp?: number;
}

// Chart Data Types (for components)
export interface ChartDataPoint {
  label: string;
  value: number;
  carbon: number;
  [key: string]: any;
}

export interface PeriodChartData {
  daily_data?: ChartDataPoint[];
  monthly_data?: ChartDataPoint[];
  yearly_data?: ChartDataPoint[];
}