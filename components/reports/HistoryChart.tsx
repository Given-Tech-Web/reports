'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush 
} from 'recharts';

interface PredictionModel {
  id: string;
  student_name: string;
  model_name: string;
  prediction_data: { time: string; value: number }[];
}

export default function HistoryChart({ deviceId }: { deviceId: string }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [chartData, setChartData] = useState<any[]>([]);
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

  const [models, setModels] = useState<PredictionModel[]>([]);
  
  // 🌟 [요청 반영] 이름별 복수 선택 및 모델별 복수 선택을 위한 State 분리
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newStudent, setNewStudent] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newJson, setNewJson] = useState("");

  useEffect(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);
    
    const initialStart = start.toISOString().split('T')[0];
    const initialEnd = today.toISOString().split('T')[0];
    
    setStartDate(initialStart);
    setEndDate(initialEnd);
    
    if (deviceId) {
      fetchDataAndModels(initialStart, initialEnd);
    }
  }, [deviceId]);

  // 🌟 [요청 반영] 기간(Start ~ End)이 바뀔 때 실제 데이터와 예측 데이터를 해당 기간에 맞춰 동시 조회
  const fetchDataAndModels = async (startStr: string, endStr: string) => {
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
      // 1. 실제 발전량 및 요약 데이터 조회
      const resHistory = await fetch(`/api/reports/history?deviceId=${deviceId}&start=${startStr}&end=${endStr}`);
      if (!resHistory.ok) throw new Error('실제 데이터 로드 실패');
      const historyData = await resHistory.json();
      
      setChartData(historyData.chartData || []);
      
      if (historyData.summary) {
        setSummary({
          total_energy_kwh: historyData.summary.total_energy_kwh || 0,
          total_carbon_kg: historyData.summary.total_carbon_kg || 0,
          avg_daily_solar: historyData.summary.avg_daily_solar || 0,
          avg_daily_carbon: historyData.summary.avg_daily_carbon || 0,
          trees_planted: historyData.summary.trees_planted || 0,
          households_powered: historyData.summary.households_powered || "0",
          cars_off_road: historyData.summary.cars_off_road || "0",
          coal_not_burned: historyData.summary.coal_not_burned || "0"
        });
      }

      // 2. 해당 기간의 예측 모델 데이터 조회
      const resModels = await fetch(`/api/predictions?start=${startStr}&end=${endStr}`);
      if (resModels.ok) {
        const modelsData = await resModels.json();
        setModels(Array.isArray(modelsData) ? modelsData : []);
      }
    } catch (error) {
      console.error("데이터 로드 에러:", error);
      alert('데이터를 가져오지 못했습니다.');
    }
  };

  const handleSaveModel = async () => {
    if (!newStudent || !newModel || !newJson) {
      return alert("모든 항목을 입력해주세요.");
    }
    
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentName: newStudent, 
          modelName: newModel, 
          predictionData: newJson 
        }),
      });
      
      if (res.ok) {
        alert("예측 데이터가 성공적으로 누적 저장되었습니다!");
        setNewStudent(""); 
        setNewModel(""); 
        setNewJson(""); 
        setIsFormOpen(false);
        fetchDataAndModels(startDate, endDate);
      } else {
        alert("저장에 실패했습니다. JSON 포맷을 확인해주세요.");
      }
    } catch (error) {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  // 학생(이름) 다중 선택 토글
  const toggleStudentSelection = (studentName: string) => {
    setSelectedStudents((prev) => {
      const next = prev.includes(studentName) ? prev.filter((s) => s !== studentName) : [...prev, studentName];
      // 만약 학생 선택이 해제되면, 해당 학생에 속했던 모델 선택도 자동으로 해제
      if (!next.includes(studentName)) {
        const studentModels = models.filter((m) => m.student_name === studentName).map((m) => m.id);
        setSelectedModels((mPrev) => mPrev.filter((id) => !studentModels.includes(id)));
      }
      return next;
    });
  };

  // 모델명 다중 선택 토글
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) => 
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

// 🌟 고유 키 형식 통일 (이름과 모델명을 명확히 결합)
  const uniqueStudents = Array.from(new Set(models.map((m) => m.student_name)));
  const getModelDataKey = (studentName: string, modelName: string) => {
    return `${studentName}-${modelName}`;
  };

  const mergedChartData = chartData.map((actual) => {
    const mergedPoint: any = { ...actual };

    selectedModels.forEach((id) => {
      const model = models.find((m) => m.id === id);
      if (model && model.prediction_data) {
        const predictionKey = getModelDataKey(model.student_name, model.model_name);
        const matchedPred = model.prediction_data.find((p) => p.time === actual.date);
        mergedPoint[predictionKey] = matchedPred ? matchedPred.value : null;
      }
    });
    return mergedPoint;
  });

  const colors = [
    "#8b5cf6", // 보라 (Violet)
    "#3b82f6", // 파랑 (Blue)
    "#10b981", // 에메랄드 (Emerald)
    "#ec4899", // 핑크 (Pink)
    "#06b6d4", // 청록 (Cyan)
    "#ef4444", // 레드 (Red)
    "#84cc16", // 라임 (Lime)
    "#6366f1", // 인디고 (Indigo)
    "#14b8a6", // 틸 (Teal)
    "#d946ef", // 퍼플 (Fuchsia)
    "#38bdf8", // 스카이 블루 (Sky)
    "#fb7185", // 로즈 (Rose)
    "#a855f7", // 퍼플 계열
    "#eab308", // 골드/노랑 (Yellow)
    "#10b981"  // 민트 계열
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Custom Period History</h2>
            <p className="text-sm text-gray-500 mt-1">실제 태양광 발전량 및 예측 모델 비교</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => fetchDataAndModels(startDate, endDate)}
                className="ml-2 px-4 py-1.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors h-full min-h-[38px]"
            >
              {isFormOpen ? "폼 닫기" : "+ 모델 등록"}
            </button>
          </div>
        </div>

        {/* 예측 모델 등록 폼 */}
        {isFormOpen && (
          <div className="mb-8 p-5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">이름</label>
                <input 
                  type="text" 
                  value={newStudent} 
                  onChange={(e) => setNewStudent(e.target.value)} 
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="예: 박지희"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">모델명 (알고리즘)</label>
                <input 
                  type="text" 
                  value={newModel} 
                  onChange={(e) => setNewModel(e.target.value)} 
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="예: Random Forest v1"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">예측 JSON 데이터 배열</label>
              <p className="text-xs text-gray-500 mb-2">형식: {'[{"time": "2026-09-14 10:00", "value": 2.5}]'}</p>
              <textarea 
                value={newJson} 
                onChange={(e) => setNewJson(e.target.value)} 
                className="w-full px-3 py-2 border rounded font-mono text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="여기에 JSON 데이터를 붙여넣으세요..."
              />
            </div>
            <button 
              onClick={handleSaveModel} 
              className="bg-emerald-500 text-white px-6 py-2 rounded font-semibold hover:bg-emerald-600 shadow-sm transition-colors"
            >
              데이터 저장하기
            </button>
          </div>
        )}

        {/* 🌟 [요청 반영] 2단계 필터 UI: 이름별 복수 선택 + 선택된 이름의 하위 모델별 복수 선택 */}
        {uniqueStudents.length > 0 && (
          <div className="mb-6 bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">1. 이름 선택 (다중 선택 가능):</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueStudents.map((student) => {
                  const isStudentChecked = selectedStudents.includes(student);
                  return (
                    <button
                      key={student}
                      onClick={() => toggleStudentSelection(student)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                        isStudentChecked 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {student}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedStudents.length > 0 && (
              <div className="pt-2 border-t border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">2. 모델 선택 (다중 선택 가능):</h3>
                <div className="flex flex-wrap gap-2">
                  {models
                    .filter((m) => selectedStudents.includes(m.student_name))
                    .map((model) => {
                      const isModelChecked = selectedModels.includes(model.id);
                      const inputId = `model-checkbox-${model.id}`;
                      return (
                        <label 
                          key={model.id} htmlFor={inputId}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition-colors ${
                            isModelChecked ? 'bg-indigo-100 border-indigo-300 text-indigo-900 font-semibold' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isModelChecked}
                            onChange={() => toggleModelSelection(model.id)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            id={inputId}
                          />
                          <span>{model.student_name} - {model.model_name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 차트 영역 (배터리 완전 제거, 오직 태양광 + 선택된 예측 모델들만 표시) */}
        <div className="w-full" style={{ height: '380px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
              
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                formatter={(value: number, name: string) => [`${value.toFixed(2)} kW`, name]}
              />
              <Legend verticalAlign="top" height={36} />
              
              {/* 실제 태양광 발전량 실선 */}
              <Line 
                yAxisId="left" 
                type="linear" 
                dataKey="solar" 
                name="Solar Power" 
                stroke="#F59E0B" 
                strokeWidth={2} 
                activeDot={{ r: 6 }} 
                isAnimationActive={false} 
                dot={mergedChartData.length === 1 ? { r: 5, fill: '#F59E0B' } : false} 
              />
              
              {/* 선택된 학생들의 예측 모델 점선들 */}
              {selectedModels.map((id, index) => {
                const model = models.find((m) => m.id === id);
                if (!model) return null;
                
                const dataKey = getModelDataKey(model.student_name, model.model_name);
                const color = colors[index % colors.length];
                return (
                  <Line 
                    key={id}
                    yAxisId="left" 
                    type="linear" 
                    dataKey={dataKey} 
                    stroke={color} 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                );
              })}

              <Brush dataKey="date" height={30} stroke="#CBD5E1" fill="#F8FAFC" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 요약(Summary) 영역 */}
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
    </div>
  );
}