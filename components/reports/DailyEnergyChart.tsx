"use client";

import { useMemo, useState, useEffect } from "react";

interface Props {
  data: any;
  period: "day" | "week" | "month";
}

export default function DailyEnergyChart({ data, period }: Props) {
  const [isClient, setIsClient] = useState(false);
  const [timeRange, setTimeRange] = useState<'12hours' | '24hours'>('12hours');

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Create data based on timeRange
  const chartData = useMemo(() => {
    if (!isClient) return [];

    const currentHour = new Date().getHours();
    let hours: number[];

    if (timeRange === '24hours') {
      // Show full 24 hours
      hours = Array.from({ length: 24 }, (_, i) => i);
    } else {
      // Show last 12 hours
      const startHour = Math.max(0, currentHour - 11);
      const endHour = currentHour + 1;
      hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
    }

    // Handle Chart.js style mock data
    if (data?.datasets && data?.labels) {
      const solarData = data.datasets.find((d: any) => d.label.includes('Solar')) || data.datasets[0];
      const carbonData = data.datasets.find((d: any) => d.label.includes('Carbon')) || data.datasets[1];

      return hours.map(hour => {
        // Map hour to closest data point
        const dataIndex = Math.floor((hour / 23) * (solarData?.data?.length - 1 || 0));
        const solarPower = (solarData?.data?.[dataIndex] || 0) * 1000; // Convert kW to W
        const carbonValue = carbonData?.data?.[dataIndex] || 0;

        return {
          hour,
          today: solarPower,
          yesterday: 0,
          carbon: carbonValue,
          hasToday: solarPower > 0,
          hasYesterday: false,
          isFuture: hour > currentHour,
          isCurrentHour: hour === currentHour
        };
      });
    }

    // Handle database style data
    const todayDataMap = new Map();
    if (data?.hourly_data) {
      data.hourly_data.forEach((point: any) => {
        // Use the hour field directly from the API response
        const hour = point.hour;
        todayDataMap.set(hour, point);
      });
    }

    const yesterdayDataMap = new Map();
    if (data?.yesterday_hourly_data) {
      data.yesterday_hourly_data.forEach((point: any) => {
        // Use the hour field directly from the API response
        const hour = point.hour;
        yesterdayDataMap.set(hour, point);
      });
    }

    return hours.map(hour => {
      // For 24-hour mode, only mark future hours as those after current hour for today's data
      // For 12-hour mode, keep the original logic
      const isFuture = timeRange === '24hours'
        ? false  // In 24-hour mode, we show all available data regardless of current time
        : hour > currentHour;

      return {
        hour,
        today: parseFloat(todayDataMap.get(hour)?.solar_power) || 0,
        yesterday: parseFloat(yesterdayDataMap.get(hour)?.solar_power) || 0,
        hasToday: todayDataMap.has(hour),
        hasYesterday: yesterdayDataMap.has(hour),
        isFuture,
        isCurrentHour: hour === currentHour
      };
    });
  }, [data, isClient, timeRange]);

  const maxPower = useMemo(() => {
    if (!chartData.length) return 3000; // Default 3kW max
    const todayMax = Math.max(...chartData.map(d => d.today));
    const yesterdayMax = Math.max(...chartData.map(d => d.yesterday));
    const max = Math.max(todayMax, yesterdayMax, 1000);
    // Round up to nearest 500W
    const result = Math.ceil(max / 500) * 500;
    console.log('MaxPower calculation:', { todayMax, yesterdayMax, max, result });
    return result;
  }, [chartData]);

  const totalEnergy = data?.summary?.total_energy_kwh || 0;
  const yesterdayEnergy = useMemo(() => {
    if (!data?.yesterday_hourly_data) return 0;
    return data.yesterday_hourly_data.reduce((sum: number, point: any) => 
      sum + (point.solar_power || 0) / 1000, 0
    );
  }, [data]);

  // Create smooth SVG path for line chart with area fill
  const createPath = (dataKey: 'today' | 'yesterday', includeArea: boolean = false) => {
    // Keep all data points to maintain correct x positioning
    const points = chartData.map((d, index) => {
      const hasData = dataKey === 'today' ? d.hasToday : d.hasYesterday;
      return {
        x: (index / (chartData.length - 1 || 1)) * 500,
        y: hasData ? (100 - ((d[dataKey] / maxPower) * 100)) : null,
        hasData
      };
    });

    // Filter out points without data for path creation
    const validPoints = points.filter(p => p.hasData && p.y !== null);
    if (validPoints.length === 0) return '';

    // Create smooth curve using bezier curves
    let path = `M ${validPoints[0].x} ${validPoints[0].y}`;

    for (let i = 1; i < validPoints.length; i++) {
      const cp1x = (validPoints[i - 1].x + validPoints[i].x) / 2;
      const cp1y = validPoints[i - 1].y;
      const cp2x = (validPoints[i - 1].x + validPoints[i].x) / 2;
      const cp2y = validPoints[i].y;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${validPoints[i].x} ${validPoints[i].y}`;
    }

    // Add area path if requested
    if (includeArea && validPoints.length > 0) {
      path += ` L ${validPoints[validPoints.length - 1].x} 100 L ${validPoints[0].x} 100 Z`;
    }

    return path;
  };

  const todayPath = createPath('today');
  const todayAreaPath = createPath('today', true);
  const yesterdayPath = createPath('yesterday');
  const yesterdayAreaPath = createPath('yesterday', true);

  // Debug logging
  if (isClient && chartData.length > 0) {
    console.log('Chart Debug:', {
      chartData: chartData,
      todayPath: todayPath,
      maxPower: maxPower,
      hasData: chartData.some(d => d.hasToday),
      dataValues: chartData.map(d => ({ hour: d.hour, today: d.today, hasToday: d.hasToday }))
    });
  }

  // Loading state
  if (!isClient) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Operational Data</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div>No data available for today</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate max power for the day
  const todayMaxPower = Math.max(...chartData.map(d => d.today));
  const currentPower = chartData.find(d => d.isCurrentHour)?.today || 0;
  const totalToday = chartData.reduce((sum, d) => sum + (d.today / 1000 * 0.5), 0); // Approximate kWh

  return (
    <div className="bg-gradient-to-br from-white to-yellow-50 rounded-xl shadow-xl p-6">
      {/* Time Range Selector integrated in the card */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex rounded-lg shadow-sm bg-white p-1">
          <button
            onClick={() => setTimeRange('12hours')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '12hours'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            12 Hours
          </button>
          <button
            onClick={() => setTimeRange('24hours')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '24hours'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            24 Hours
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            ☀️ {timeRange === '24hours' ? "Today's 24 Hours" : 'Recent 12 Hours'} Solar Production
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {isClient ? `${new Date(data?.date || new Date()).toLocaleDateString()} (${timeRange === '24hours' ? 'Full day' : 'Last 12 hours'})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current</p>
            <p className="text-xl font-bold text-yellow-600">
              {(currentPower / 1000).toFixed(2)} kW
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Peak Today</p>
            <p className="text-xl font-bold text-orange-600">
              {(todayMaxPower / 1000).toFixed(2)} kW
            </p>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 w-12">
          <span>{(maxPower / 1000).toFixed(1)}kW</span>
          <span>{(maxPower * 0.75 / 1000).toFixed(1)}kW</span>
          <span>{(maxPower * 0.5 / 1000).toFixed(1)}kW</span>
          <span>{(maxPower * 0.25 / 1000).toFixed(1)}kW</span>
          <span>0kW</span>
        </div>

        {/* Chart SVG */}
        <div className="ml-14 h-full relative">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
            {/* Define gradients */}
            <defs>
              <linearGradient id="solarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="yesterdayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="sunriseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Background sunrise effect removed for 6-hour view */}

            {/* Grid lines */}
            <line x1="0" y1="0" x2="500" y2="0" stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
            <line x1="0" y1="25" x2="500" y2="25" stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
            <line x1="0" y1="50" x2="500" y2="50" stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
            <line x1="0" y1="75" x2="500" y2="75" stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.5" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="#fbbf24" strokeWidth="0.8" opacity="0.3" />
            
            {/* Vertical grid lines for displayed hours */}
            {chartData.map((d, index) => (
              <line
                key={d.hour}
                x1={(index / (chartData.length - 1 || 1)) * 500}
                y1="0"
                x2={(index / (chartData.length - 1 || 1)) * 500}
                y2="100"
                stroke="#e5e7eb"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.3"
              />
            ))}
            
            {/* Yesterday's area (if available) */}
            {yesterdayAreaPath && (
              <path
                d={yesterdayAreaPath}
                fill="url(#yesterdayGradient)"
                opacity="0.5"
              />
            )}

            {/* Today's area */}
            {todayAreaPath && (
              <path
                d={todayAreaPath}
                fill="url(#solarGradient)"
                opacity="0.6"
              />
            )}

            {/* Yesterday's line (if available) */}
            {yesterdayPath && (
              <path
                d={yesterdayPath}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="0.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
            )}

            {/* Today's line */}
            {todayPath && (
              <path
                d={todayPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            
            {/* Data points removed for cleaner look */}
            
            {/* Data points for yesterday - removed since we only show today */}

            {/* Current time indicator */}
            {chartData.find(d => d.isCurrentHour) && (() => {
              const currentIndex = chartData.findIndex(d => d.isCurrentHour);
              const xPos = (currentIndex / (chartData.length - 1 || 1)) * 500;
              return (
                <>
                  <line
                    x1={xPos}
                    y1="0"
                    x2={xPos}
                    y2="100"
                    stroke="#ef4444"
                    strokeWidth="0.75"
                    strokeDasharray="2,2"
                    opacity="0.8"
                  />
                  <text
                    x={xPos}
                    y="-2"
                    fill="#ef4444"
                    fontSize="4"
                    textAnchor="middle"
                  >
                    NOW
                  </text>
                </>
              );
            })()}
          </svg>
          
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 -mb-5">
            {chartData.map((d, index) => {
              // For 24 hours, show every 3rd or 4th hour label to avoid overcrowding
              const showLabel = timeRange === '24hours' ? index % 3 === 0 : true;
              const icon = d.hour < 6 ? '🌙' : d.hour < 12 ? '🌅' : d.hour < 18 ? '☀️' : '🌇';
              return showLabel ? (
                <span key={d.hour} className="flex items-center gap-1">
                  {icon} {String(d.hour).padStart(2, '0')}:00
                </span>
              ) : <span key={d.hour}></span>;
            })}
          </div>

          {/* Hover tooltips */}
          <div className="absolute inset-0">
            {chartData.map((d, index) => (
              <div
                key={d.hour}
                className="absolute top-0 bottom-0 hover:bg-gray-100 hover:bg-opacity-20 transition-colors cursor-pointer group"
                style={{
                  left: `${(index / (chartData.length - 1 || 1)) * 100}%`,
                  width: `${100 / chartData.length}%`
                }}
                title={`${d.hour}:00 - Solar: ${d.today}W`}
              >
                <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <div>{String(d.hour).padStart(2, '0')}:00</div>
                  {d.hasToday && (
                    <div className="text-yellow-300">Solar: {Math.round(d.today)}W</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats with better design */}
      <div className="mt-8 pt-6 border-t border-yellow-200">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">⚡</span>
              <span className="text-xs text-gray-500 uppercase">Energy</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">
              {totalEnergy.toFixed(1)}
            </p>
            <p className="text-xs text-gray-600">kWh today</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">🔥</span>
              <span className="text-xs text-gray-500 uppercase">Peak</span>
            </div>
            <p className="text-xl font-bold text-orange-600">
              {(todayMaxPower / 1000).toFixed(2)}
            </p>
            <p className="text-xs text-gray-600">kW max</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">🌱</span>
              <span className="text-xs text-gray-500 uppercase">CO₂</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {(totalEnergy * 0.4781).toFixed(1)}
            </p>
            <p className="text-xs text-gray-600">kg saved</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">📈</span>
              <span className="text-xs text-gray-500 uppercase">Efficiency</span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {((totalToday / (todayMaxPower * 0.024)) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-600">utilization</p>
          </div>
        </div>

        {/* Time periods analysis */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <p className="text-xs text-gray-500">Morning (6-12)</p>
            <p className="font-semibold text-yellow-600">
              {chartData.filter(d => d.hour >= 6 && d.hour < 12)
                .reduce((sum, d) => sum + d.today, 0) / 1000 * 0.5 > 0
                ? (chartData.filter(d => d.hour >= 6 && d.hour < 12)
                    .reduce((sum, d) => sum + d.today, 0) / 1000 * 0.5).toFixed(1) + ' kWh'
                : '- kWh'
              }
            </p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <p className="text-xs text-gray-500">Noon (12-15)</p>
            <p className="font-semibold text-orange-600">
              {chartData.filter(d => d.hour >= 12 && d.hour < 15)
                .reduce((sum, d) => sum + d.today, 0) / 1000 * 0.5 > 0
                ? (chartData.filter(d => d.hour >= 12 && d.hour < 15)
                    .reduce((sum, d) => sum + d.today, 0) / 1000 * 0.5).toFixed(1) + ' kWh'
                : '- kWh'
              }
            </p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-500">Afternoon (15-18)</p>
            <p className="font-semibold text-purple-600">
              {chartData.filter(d => d.hour >= 15 && d.hour < 18)
                .reduce((sum, d) => sum + d.today, 0) / 1000 * 0.5 > 0
                ? (chartData.filter(d => d.hour >= 15 && d.hour < 18)
                    .reduce((sum, d) => sum + d.today, 0) / 1000 * 0.5).toFixed(1) + ' kWh'
                : '- kWh'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}