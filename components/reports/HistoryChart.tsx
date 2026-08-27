'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush 
} from 'recharts';

export default function HistoryChart({ deviceId }: { deviceId: string }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);

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
      // 💡 Proxy가 아닌 새로 만든 Next.js API를 직접 호출합니다!
      const res = await fetch(`/api/reports/history?deviceId=${deviceId}&start=${startStr}&end=${endStr}`);
      
      if (!res.ok) throw new Error('데이터 로드 실패');

      const rawData = await res.json();
      
      const formattedData = rawData.map((item: any) => ({
        date: item.date,
        solar: Number(item.solar) || 0,
        battery: Number(item.battery) || 0
      }));

      setChartData(formattedData);
      
    } catch (error) {
      console.error(error);
      alert('데이터를 가져오지 못했습니다.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
            조회
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
                if (name === "배터리 용량") return [`${value.toFixed(1)} kWh`, name];
                return [`${value.toFixed(2)} kW`, name];
              }}
            />
            <Legend verticalAlign="top" height={36} />
            
            <Line yAxisId="left" type="linear" dataKey="solar" name="태양광 발전" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 6 }} isAnimationActive={false} />
            <Line yAxisId="right" type="linear" dataKey="battery" name="배터리 용량" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />

            <Brush dataKey="date" height={30} stroke="#CBD5E1" fill="#F8FAFC" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}