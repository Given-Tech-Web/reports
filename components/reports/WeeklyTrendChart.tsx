"use client";

import { useState, useEffect } from "react";

interface Props {
  data: any;
}

export default function WeeklyTrendChart({ data }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Fill missing days with zero values for complete 7-day display
  const fillMissingDays = (inputData: any) => {
    if (!isClient) return [];

    const result = [];
    const today = new Date();

    // Handle Chart.js style mock data
    if (inputData?.datasets && inputData?.labels) {
      const solarData = inputData.datasets.find((d: any) => d.label.includes('Generation')) || inputData.datasets[0];
      const carbonData = inputData.datasets.find((d: any) => d.label.includes('Carbon')) || inputData.datasets[1];

      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - i);
        const dateStr = targetDate.toISOString().split('T')[0];

        result.push({
          date: dateStr,
          total_kwh: solarData?.data?.[6 - i] || 0,
          carbon_saved: carbonData?.data?.[6 - i] || 0,
          peak_power: (solarData?.data?.[6 - i] || 0) * 1.2,
          avg_battery: 75 + Math.random() * 20,
          generator_hours: 0,
          avg_load: 30 + Math.random() * 20
        });
      }

      return result;
    }

    // Handle database style data
    const dailyData = inputData?.daily_data || [];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];

      // Find data for this date (handle both YYYY-MM-DD and ISO datetime formats)
      const existingData = dailyData.find((d: any) => {
        const dataDate = d.date?.split('T')[0];
        return dataDate === dateStr;
      });

      if (existingData) {
        result.push({
          ...existingData,
          date: dateStr,
          total_kwh: existingData.total_solar_kwh || existingData.total_kwh || 0,
          carbon_saved: existingData.carbon_reduction || existingData.carbon_saved || 0
        });
      } else {
        result.push({
          date: dateStr,
          total_kwh: 0,
          peak_power: 0,
          avg_battery: 0,
          carbon_saved: 0,
          generator_hours: 0,
          avg_load: 0
        });
      }
    }

    return result;
  };

  const chartData = fillMissingDays(data);
  const maxKwh = Math.max(...chartData.map((d: any) => parseFloat(d.total_kwh) || 0), 1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Operational Data</h3>

      {/* Bar Chart */}
      <div className="relative h-64">
        {chartData.length > 0 ? (
          <>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 w-12">
              <span>{maxKwh.toFixed(1)}</span>
              <span>{(maxKwh / 2).toFixed(1)}</span>
              <span>0 kWh</span>
            </div>

            {/* Bars */}
            <div className="ml-14 h-full flex items-end justify-between gap-2">
              {chartData.map((d: any, i: number) => {
                const height = maxKwh > 0 ? (parseFloat(d.total_kwh) / maxKwh) * 100 : 0;
                const dateObj = isClient ? new Date(d.date) : null;
                const dateLabel = isClient && dateObj ? `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}` : '';
                const dayName = isClient ? new Date(d.date).toLocaleDateString('en', { weekday: 'short' }) : '';
                const isToday = isClient ? new Date(d.date).toDateString() === new Date().toDateString() : false;

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end"
                  >
                    <div className="relative w-full">
                      <div
                        className={`w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer ${
                          isToday
                            ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                            : 'bg-gradient-to-t from-blue-500 to-blue-300'
                        }`}
                        style={{ height: `${height * 2.5}px` }}
                        title={`${parseFloat(d.total_kwh).toFixed(2)} kWh on ${dateLabel} (${dayName})`}
                      />
                      {/* Value label on top of bar */}
                      {parseFloat(d.total_kwh) > 0 && (
                        <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700">
                          {parseFloat(d.total_kwh).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs mt-2 ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                      {dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid lines */}
            <div className="absolute inset-0 ml-14 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-gray-200 opacity-50"></div>
              <div className="border-t border-gray-200 opacity-30"></div>
              <div className="border-t border-gray-200 opacity-50"></div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No weekly data available
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-600">Total This Week</p>
          <p className="text-lg font-semibold text-gray-900">
            {chartData.reduce((sum, d) => sum + (parseFloat(d.total_kwh) || 0), 0).toFixed(2)} kWh
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Daily Average</p>
          <p className="text-lg font-semibold text-gray-900">
            {(chartData.reduce((sum, d) => sum + (parseFloat(d.total_kwh) || 0), 0) / 7).toFixed(2)} kWh
          </p>
        </div>
      </div>
    </div>
  );
}