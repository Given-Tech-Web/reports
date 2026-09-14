"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface HistoryChartProps {
  deviceId: string;
}

interface PredictionModel {
  id: string;
  student_name: string;
  model_name: string;
  prediction_data: { time: string; value: number }[];
}

export default function HistoryChart({ deviceId }: HistoryChartProps) {
  const [actualData, setActualData] = useState<any[]>([]);
  const [models, setModels] = useState<PredictionModel[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newStudent, setNewStudent] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newJson, setNewJson] = useState("");

  const fetchActualData = async () => {
    try {
      const res = await fetch("/api/reports/history?deviceId=" + deviceId);
      if (res.ok) {
        const data = await res.json();
        setActualData(data);
      }
    } catch (error) {
      console.error("Actual data fetch error:", error);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/predictions");
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch (error) {
      console.error("Models fetch error:", error);
    }
  };

  useEffect(() => {
    fetchActualData();
    fetchModels();
  }, [deviceId]);

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
        fetchModels();
      } else {
        alert("저장에 실패했습니다. JSON 포맷을 확인해주세요.");
      }
    } catch (error) {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  const toggleModelSelection = (id: string) => {
    setSelectedModelIds((prev) => 
      prev.includes(id) ? prev.filter((modelId) => modelId !== id) : [...prev, id]
    );
  };

  const mergedChartData = actualData.map((actual) => {
    const mergedPoint: any = { time: actual.date, Actual_Solar: actual.solar };

    selectedModelIds.forEach((id) => {
      const model = models.find((m) => m.id === id);
      if (model) {
        const predictionKey = model.student_name + " (" + model.model_name + ")";
        const matchedPred = model.prediction_data.find((p) => p.time === actual.date);
        mergedPoint[predictionKey] = matchedPred ? matchedPred.value : null;
      }
    });
    return mergedPoint;
  });

  const colors = ["#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#3b82f6"];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Actual vs Prediction Models</h2>
          <p className="text-sm text-gray-500 mt-1">시간별 발전량 예측 모델과 실제 발전량 비교</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          {isFormOpen ? "닫기" : "+ 새 예측 모델 등록"}
        </button>
      </div>

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
            <p className="text-xs text-gray-500 mb-2">형식: <code>{[{"time": "2026-09-14 10:00", "value": 2.5}]}</code></p>
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

      {models.length > 0 && (
        <div className="mb-6 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">비교할 예측 모델 선택 (다중 선택 가능):</h3>
          <div className="flex flex-wrap gap-3">
            {models.map((model) => {
              const isChecked = selectedModelIds.includes(model.id);
              const labelClass = "flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors " + (isChecked ? "bg-blue-100 border-blue-300" : "bg-white hover:bg-gray-50");
              
              return (
                <label key={model.id} className={labelClass}>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => toggleModelSelection(model.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    {model.student_name} <span className="text-gray-500">({model.model_name})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-96 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mergedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            
            <Line 
              type="monotone" 
              dataKey="Actual_Solar" 
              name="실제 발전량 (Actual)" 
              stroke="#22c55e" 
              strokeWidth={4} 
              dot={false}
              activeDot={{ r: 6 }}
            />
            
            {selectedModelIds.map((id, index) => {
              const model = models.find((m) => m.id === id);
              if (!model) return null;
              
              const dataKey = model.student_name + " (" + model.model_name + ")";
              const color = colors[index % colors.length]; 
              
              return (
                <Line 
                  key={id} 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke={color} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
    </div>
  );
}