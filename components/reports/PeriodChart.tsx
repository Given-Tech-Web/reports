"use client";

import { useMemo, useState, useEffect } from "react";

interface ChartDataItem {
  label: string;
  value: number;
  carbon: number;
  month?: string;
  date?: string;
  year?: number;
}

interface Props {
  data: any;
  period: "month" | "year" | "total";
}

export default function PeriodChart({ data, period }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = useMemo<ChartDataItem[]>(() => {
    if (!isClient || !data) return [];

    switch (period) {
      case 'month':
        // If monthly_data exists, show 12 months (year view)
        if (data.monthly_data) {
          return data.monthly_data?.map((item: any) => ({
            label: item.month_name || new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
            value: parseFloat(item.total_solar_kwh) || 0,
            carbon: parseFloat(item.carbon_reduction) || 0,
            month: item.month
          })) || [];
        }
        // Otherwise show daily data for single month
        return data.daily_data?.slice(-30).map((item: any, index: number) => ({
          label: new Date(item.date).getDate().toString(),
          value: parseFloat(item.total_solar_kwh) || 0,
          carbon: parseFloat(item.carbon_reduction) || 0,
          date: item.date
        })) || [];

      case 'year':
        return data.yearly_data?.map((item: any) => ({
          label: item.year.toString(),
          value: parseFloat(item.total_solar_kwh) || 0,
          carbon: parseFloat(item.carbon_reduction) || 0,
          year: item.year
        })) || [];

      case 'total':
        return data.yearly_data?.map((item: any) => ({
          label: item.year.toString(),
          value: parseFloat(item.total_solar_kwh) || 0,
          carbon: parseFloat(item.carbon_reduction) || 0,
          year: item.year
        })) || [];

      default:
        return [];
    }
  }, [data, period, isClient]);

  const maxValue = useMemo(() => {
    if (!chartData.length) return 1000;
    const max = Math.max(...chartData.map((d: any) => d.value));
    // Ensure we have a minimum value to avoid division by zero
    if (max === 0 || isNaN(max)) return 100;
    return Math.ceil(max * 1.1 / 100) * 100;
  }, [chartData]);

  const totalEnergy = chartData.reduce((sum: number, item: ChartDataItem) => sum + item.value, 0);
  const totalCarbon = chartData.reduce((sum: number, item: ChartDataItem) => sum + item.carbon, 0);

  // Loading state
  if (!isClient) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {period === "month" && data.monthly_data ? "Monthly Operational Data" : period === "month" ? "Monthly" : period === "year" ? "Annual Operational Data" : "All-Time"} Performance
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <div>No data available for this period</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {period === "month" && data.monthly_data ? "Monthly Operational Data" : period === "month" ? "Monthly" : period === "year" ? "Annual Operational Data" : "All-Time"} Performance
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Solar Energy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Carbon Saved</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 w-16">
          <span>{maxValue.toFixed(0)}</span>
          <span>{(maxValue * 0.75).toFixed(0)}</span>
          <span>{(maxValue * 0.5).toFixed(0)}</span>
          <span>{(maxValue * 0.25).toFixed(0)}</span>
          <span>0</span>
        </div>

        {/* Chart Container */}
        <div className="ml-18 h-full relative">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
            ))}

            {/* Vertical grid lines */}
            {chartData.map((_, index) => {
              const x = (index / (chartData.length - 1 || 1)) * 100;
              return (
                <line key={index} x1={x} y1="0" x2={x} y2="100" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5" />
              );
            })}

            {/* Solar energy bars */}
            {chartData.map((item, index) => {
              const x = (index / (chartData.length - 1 || 1)) * 100;
              const safeValue = isNaN(item.value) ? 0 : item.value;
              const height = maxValue > 0 ? (safeValue / maxValue) * 100 : 0;
              const y = 100 - height;
              const barWidth = 100 / (chartData.length * 2);

              // Validate all values before rendering
              if (isNaN(x) || isNaN(y) || isNaN(height) || isNaN(barWidth)) {
                return null;
              }

              return (
                <rect
                  key={`solar-${index}`}
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill="#eab308"
                  opacity="0.8"
                />
              );
            })}

            {/* Carbon reduction line */}
            {chartData.length > 1 && (() => {
              const maxCarbon = Math.max(...chartData.map((d: any) => d.carbon || 0));
              if (maxCarbon === 0 || isNaN(maxCarbon)) return null;

              const points = chartData.map((item, index) => {
                const x = (index / (chartData.length - 1)) * 100;
                const safeCarbon = isNaN(item.carbon) ? 0 : item.carbon;
                const y = 100 - ((safeCarbon / maxCarbon) * 100);
                return `${x},${y}`;
              }).join(' ');

              return (
                <polyline
                  points={points}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })()}

            {/* Carbon reduction points */}
            {chartData.map((item, index) => {
              const x = (index / (chartData.length - 1 || 1)) * 100;
              const maxCarbon = Math.max(...chartData.map((d: any) => d.carbon || 0));

              // Skip if no carbon data
              if (maxCarbon === 0 || isNaN(maxCarbon)) return null;

              const safeCarbon = isNaN(item.carbon) ? 0 : item.carbon;
              const y = 100 - ((safeCarbon / maxCarbon) * 100);

              // Validate values
              if (isNaN(x) || isNaN(y)) return null;

              return (
                <circle
                  key={`carbon-${index}`}
                  cx={x}
                  cy={y}
                  r="1"
                  fill="#22c55e"
                />
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 -mb-5">
            {period === 'month' && data.monthly_data ? (
              // Show all 12 months for year view
              chartData.map((item, index) => (
                <span key={index} className="text-center" style={{ width: `${100 / 12}%` }}>
                  {item.label}
                </span>
              ))
            ) : (
              // Show subset for other views
              chartData.slice(0, Math.min(chartData.length, 8)).map((item, index) => {
                if (index % Math.ceil(chartData.length / 6) === 0 || index === chartData.length - 1) {
                  return <span key={index}>{item.label}</span>;
                }
                return null;
              })
            )}
          </div>

          {/* Hover tooltips */}
          <div className="absolute inset-0">
            {chartData.map((item, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 hover:bg-gray-100 hover:bg-opacity-20 transition-colors cursor-pointer group"
                style={{
                  left: `${(index / (chartData.length - 1 || 1)) * 100}%`,
                  width: `${100 / chartData.length}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-yellow-300">Solar: {(item.value || 0).toFixed(1)} kWh</div>
                  <div className="text-green-300">Carbon: {(item.carbon || 0).toFixed(1)} kg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-8 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-600">
            {period === "month" && data.monthly_data ? "Year Total" : period === "month" ? "Month Total" : period === "year" ? "Year Total" : "All-Time Total"}
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {totalEnergy.toFixed(1)} kWh
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Carbon Reduction</p>
          <p className="text-lg font-semibold text-green-600">
            {totalCarbon.toFixed(1)} kg
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">
            {period === "month" && data.monthly_data ? "Monthly Avg" : period === "month" ? "Daily Avg" : period === "year" ? "Yearly Avg" : "Yearly Avg"}
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {(totalEnergy / (chartData.length || 1)).toFixed(1)} kWh
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Peak Period</p>
          <p className="text-lg font-semibold text-gray-900">
            {chartData.length > 0
              ? chartData.reduce((max, item) => item.value > max.value ? item : max, chartData[0]).label
              : "N/A"
            }
          </p>
        </div>
      </div>
    </div>
  );
}