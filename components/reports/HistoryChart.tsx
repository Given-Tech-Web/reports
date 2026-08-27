'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush 
} from 'recharts';

export default function HistoryChart({ deviceId }: { deviceId: string }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // 1. 차트 데이터를 담을 상태
  const [chartData, setChartData] = useState<any[]>([]);
  
  // 2. 서버에서 계산해준 정확한 요약(Summary) 데이터를 담을 상태
  const [summary, setSummary] = useState({
    total_energy_kwh: 0,
    total_carbon_kg: 0,
    avg_daily_solar: 0,
    avg_daily_carbon: 0,
    trees_planted: 0,
    households_powered: "0",
    cars_off_road: "0",
    coal_not_burned: "0"
  });

  useEffect(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);
    
    const initialStart = start.toISOString().split('T')[0];
    const initialEnd = today.toISOString().split('T')[0];
    
    setStartDate(initialStart);
    setEndDate(initialEnd);
    
    if (deviceId) {
      fetchData(initialStart, initialEnd);
    }
  }, [deviceId]);

  const fetchData = async (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (start > end) {
      alert('시작 날짜는 종료 날짜보다 이전이어야 합니다.');
      return;
    }

    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) { 
      alert('데이터는 한 번에 최대 1년(365일)까지만 조회할 수 있습니다.');
      return;
    }

    try {
      // 🌟 백엔드 API 호출
      const res = await fetch(`/api/reports/history?deviceId=${deviceId}&start=${startStr}&end=${endStr}`);
      if (!res.ok) throw new Error('데이터 로드 실패');

      const responseData = await res.json();
      
      // 🌟 1. API가 보내준 차트 배열 세팅
      setChartData(responseData.chartData || []);
      
      // 🌟 2. API가 계산해서 보내준 정확한 요약 데이터 세팅
      if (responseData.summary) {
        setSummary({
          total_energy_kwh: responseData.summary.total_energy_kwh || 0,
          total_carbon_kg: responseData.summary.total_carbon_kg || 0,
          avg_daily_solar: responseData.summary.avg_daily_solar || 0,
          avg_daily_carbon: responseData.summary.avg_daily_carbon || 0,
          trees_planted: responseData.summary.trees_planted || 0,
          households_powered: responseData.summary.households_powered || "0",
          cars_off_road: responseData.summary.cars_off_road || "0",
          coal_not_burned: responseData.summary.coal_not_burned || "0"
        });
      }
      
    } catch (error) {
      console.error("차트 에러 상세:", error);
      alert('데이터를 가져오지 못했습니다.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* --- 차트 영역 시작 --- */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-900">Custom Period History</h2>
          
          <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg border border-gray-200">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="bg-transparent outline-none cursor-pointer" 
            />
            <span className="text-gray-400 font-bold">~</span>
            <input 
              type="date" 
              value={endDate} 
              max={new Date().toISOString().split('T')[0]} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="bg-transparent outline-none cursor-pointer" 
            />
            <button 
              onClick={() => fetchData(startDate, endDate)}
              className="ml-2 px-4 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        <div className="w-full" style={{ height: '380px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} tickMargin={10} minTickGap={30} />
              
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 11, fill: '#F59E0B' }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(value) => `${Number(value).toFixed(1)} kW`} 
                domain={[0, (dataMax: number) => Math.max(Number(dataMax) || 0, 1)]} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 11, fill: '#10B981' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `${Number(value).toFixed(1)} kWh`} 
                domain={[0, (dataMax: number) => Math.max(Number(dataMax) || 0, 10)]} 
              />
              
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                formatter={(value: number, name: string) => {
                  if (name === "Battery Capacity") return [`${value.toFixed(1)} kWh`, name];
                  return [`${value.toFixed(2)} kW`, name];
                }}
              />
              <Legend verticalAlign="top" height={36} />
              
              <Line yAxisId="left" type="linear" dataKey="solar" name="Solar Power" stroke="#F59E0B" strokeWidth={2} activeDot={{ r: 6 }} isAnimationActive={false} dot={chartData.length === 1 ? { r: 5, fill: '#F59E0B' } : false} />
              <Line yAxisId="right" type="linear" dataKey="battery" name="Battery Capacity" stroke="#10B981" strokeWidth={2} isAnimationActive={false} dot={chartData.length === 1 ? { r: 5, fill: '#10B981' } : false} />

              <Brush dataKey="date" height={30} stroke="#CBD5E1" fill="#F8FAFC" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* --- 차트 영역 끝 --- */}

      {/* --- 요약(Summary) 영역 시작 --- */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Custom Period Operations Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Solar Energy</span>
            <span className="font-semibold">{summary.total_energy_kwh.toFixed(1)} kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Carbon Reduction</span>
            <span className="font-semibold text-green-600">{summary.total_carbon_kg.toFixed(1)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Carbon Reduction (Daily)</span>
            <span className="font-semibold">{summary.avg_daily_carbon.toFixed(1)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Solar Energy (Daily)</span>
            <span className="font-semibold">{summary.avg_daily_solar.toFixed(1)} kWh</span>
          </div>

          <div className="border-t border-gray-200 my-3"></div>

          <h4 className="text-sm font-semibold text-gray-700 mb-2">Custom Period CO₂ Savings Summary</h4>
          <div className="flex justify-between">
            <span className="text-gray-600">Planting Trees</span>
            <span className="font-semibold">{summary.trees_planted} trees</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Powering Households</span>
            <span className="font-semibold">{summary.households_powered} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reduce Gasoline Use</span>
            <span className="font-semibold">{summary.cars_off_road} cars/year</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reduce Coal Use</span>
            <span className="font-semibold">{summary.coal_not_burned} kg</span>
          </div>
        </div>
      </div>
      {/* --- 요약(Summary) 영역 끝 --- */}
    </div>
  );
}