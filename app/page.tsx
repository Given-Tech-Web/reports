"use client";

import { useState, useEffect, Suspense, ChangeEvent } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DailyEnergyChart from "@/components/reports/DailyEnergyChart";
import WeeklyTrendChart from "@/components/reports/WeeklyTrendChart";
import PeriodChart from "@/components/reports/PeriodChart";
import LogoutButton from "@/components/LogoutButton";
import HistoryChart from "@/components/reports/HistoryChart";

function ReportsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [myDevices, setMyDevices] = useState<string[]>([]);
  const deviceId = searchParams.get('device_id') || myDevices[0] || process.env.NEXT_PUBLIC_DEVICE_ID || "solar_system_001";

  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year" | "history">("day");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [carbonData, setCarbonData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [startCapacity, setStartCapacity] = useState<number>(30);
  const [stopCapacity, setStopCapacity] = useState<number>(80);
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(true); // 통신 중 Lock 상태
  const [generatorStatus, setGeneratorStatus] = useState<"running" | "stopped" | "unknown">("unknown");

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const user = await response.json();
          setUserRole(user.role);

          if (user.devices && user.devices.length > 0) {
            setMyDevices(user.devices);
            if (!searchParams.get('device_id')) {
              router.replace(`${pathname}?device_id=${user.devices[0]}`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserInfo();
  }, [pathname, router, searchParams]);

  const handleDeviceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    router.push(`${pathname}?device_id=${selectedId}`);
  };

  useEffect(() => {
    if (!deviceId) return;
    const fetchConfig = async () => {
      setIsConfigLoading(true);
      try {
        const res = await fetch(`/api/generator/config?deviceId=${deviceId}`);
        if (res.ok) {
          const data = await res.json();
          setStartCapacity(data.startCapacity);
          setStopCapacity(data.stopCapacity);
        }
      } catch (error) {
        console.error("Config fetch error:", error);
      } finally {
        setIsConfigLoading(false);
      }
    };
    fetchConfig();
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/generator/status?deviceId=${deviceId}`);
        if (res.ok) {
          const data = await res.json();
          setGeneratorStatus(data.status);
        }
      } catch (error) {
        console.error("Status fetch error:", error);
      }
    };

    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, [deviceId]);

  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await fetch(`/api/reports/available-years?deviceId=${deviceId}`);
        if (response.ok) {
          const data = await response.json();
          const years = data.years || [];
          if (years.length > 0) {
            setAvailableYears(years);
            if (!years.includes(selectedYear)) setSelectedYear(years[0]);
          } else {
            setAvailableYears([new Date().getFullYear()]);
          }
        } else {
          setAvailableYears([new Date().getFullYear()]);
        }
      } catch (error) {
        setAvailableYears([new Date().getFullYear()]);
      }
    };
    fetchAvailableYears();
  }, [deviceId, selectedYear]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedPeriod === "history") return;
      setLoading(true);
      try {
        const carbonResponse = await fetch(`/api/reports/carbon?period=${selectedPeriod}&deviceId=${deviceId}`);
        const carbonResult = await carbonResponse.json();
        setCarbonData(carbonResult);

        let chartResponse;
        switch (selectedPeriod) {
          case 'day': chartResponse = await fetch(`/api/reports/daily?deviceId=${deviceId}`); break;
          case 'week': chartResponse = await fetch(`/api/reports/weekly?deviceId=${deviceId}`); break;
          case 'month': chartResponse = await fetch(`/api/reports/monthly?deviceId=${deviceId}&year=${selectedYear}`); break;
          case 'year': chartResponse = await fetch(`/api/reports/yearly?deviceId=${deviceId}`); break;
          default: chartResponse = await fetch(`/api/reports/daily?deviceId=${deviceId}`);
        }

        if (chartResponse.ok) {
          setChartData(await chartResponse.json());
        } else {
          throw new Error(`Chart API failed: ${chartResponse.status}`);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setCarbonData(null);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriod, selectedYear, deviceId]);

  const handleSaveThresholds = async () => {
    if (!deviceId) return alert("먼저 기기를 선택해주세요.");
    if (startCapacity >= stopCapacity) return alert("Start capacity must be lower than stop capacity!");

    setIsConfigLoading(true);
    try {
      const response = await fetch('/api/generator/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, startCapacity, stopCapacity }),
      });
      if (response.ok) alert(`Settings saved successfully for ${deviceId}`);
      else alert('Failed to save settings.');
    } catch (error) {
      alert('Network error occurred.');
    } finally {
      setIsConfigLoading(false);
    }
  };

  const handleManualControl = async (action: 'start' | 'stop') => {
    if (!deviceId) return alert("먼저 기기를 선택해주세요.");
    
    if (action === 'start' && generatorStatus === 'running') return alert('Generator is already running.');
    if (action === 'stop' && generatorStatus === 'stopped') return alert('Generator is already stopped.');
    
    if (!confirm(`Are you sure you want to force ${action.toUpperCase()} the generator?`)) return;

    setIsConfigLoading(true);
    try {
      const response = await fetch('/api/generator/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, action }),
      });
      if (response.ok) alert(`${action.toUpperCase()} command sent.`);
      else alert('Failed to send command.');
    } catch (error) {
      alert('Network error occurred.');
    } finally {
      setGeneratorStatus(action === 'start' ? 'running' : 'stopped');
      setTimeout(() => setIsConfigLoading(false), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        {/* 헤더 부분 기존 코드 유지 */}
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <Image src="/logo.png" alt="Giventech Logo" width={120} height={32} className="object-contain" style={{ height: '32px', width: 'auto' }} priority unoptimized />
              <h1 className="text-2xl font-bold text-gray-900">EMS Dashboard</h1>
            </div>
            <div className="flex-1 flex justify-end items-center gap-4">
              {myDevices.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-600">Device:</span>
                  <select value={deviceId} onChange={handleDeviceChange} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 cursor-pointer">
                    {myDevices.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              )}
              {userRole === 'admin' && (
                <Link href="/admin" className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">🛠️ Admin</Link>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
            <p className="text-gray-600 mt-1">Real-time EMS Monitoring and Control System</p>
            <p className="text-sm font-semibold text-blue-600 mt-1">Target Device: {deviceId}</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
            <span className="text-sm font-semibold text-gray-600">Generator Status:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${generatorStatus === 'running' ? 'bg-green-500 animate-pulse' : generatorStatus === 'stopped' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
              <span className={`text-sm font-bold ${generatorStatus === 'running' ? 'text-green-600' : generatorStatus === 'stopped' ? 'text-red-600' : 'text-gray-500'}`}>
                {generatorStatus === 'running' ? 'RUNNING' : generatorStatus === 'stopped' ? 'STOPPED' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 mb-6 border border-gray-200 relative">
          
          {isConfigLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* 1. Auto Control Thresholds */}
            <div className="flex-1 border-b lg:border-b-0 lg:border-r border-gray-100 pb-5 lg:pb-0 lg:pr-6">
              <h3 className="text-base font-semibold text-gray-800 mb-1">Auto Control Thresholds</h3>
              <p className="text-xs text-gray-500 mb-3">Auto start/stop triggers based on battery %</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-50 border rounded px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="text-xs text-gray-500 w-10">Start</span>
                  <input 
                    type="number" 
                    value={startCapacity} 
                    onChange={(e) => setStartCapacity(Number(e.target.value))} 
                    disabled={isConfigLoading}
                    className="w-12 bg-transparent outline-none text-sm font-semibold text-gray-800 disabled:opacity-50" 
                    min="0" max="100"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <span className="text-gray-300">~</span>
                <div className="flex items-center bg-gray-50 border rounded px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="text-xs text-gray-500 w-10">Stop</span>
                  <input 
                    type="number" 
                    value={stopCapacity} 
                    onChange={(e) => setStopCapacity(Number(e.target.value))} 
                    disabled={isConfigLoading}
                    className="w-12 bg-transparent outline-none text-sm font-semibold text-gray-800 disabled:opacity-50" 
                    min="0" max="100"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <button 
                  onClick={handleSaveThresholds} 
                  disabled={isConfigLoading} 
                  className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>

            {/* 2. Manual Control */}
            <div className="flex-1 lg:pl-2">
              <h3 className="text-base font-semibold text-gray-800 mb-1">Manual Control</h3>
              <p className="text-xs text-gray-500 mb-3">Force start/stop ignoring auto thresholds</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleManualControl('start')} 
                  disabled={isConfigLoading || generatorStatus === 'running'} 
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-1.5 rounded shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  ▶ START
                </button>
                <button 
                  onClick={() => handleManualControl('stop')} 
                  disabled={isConfigLoading || generatorStatus === 'stopped'} 
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-1.5 rounded shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  ■ STOP
                </button>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {["day", "week", "month", "year", "history"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === period ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {period === "history" ? "History" : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}

            {selectedPeriod === "month" && availableYears.length > 0 && (
              <>
                <div className="w-px h-8 bg-gray-300 mx-2" />
                <label className="text-sm font-medium text-gray-700">Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Chart Display */}
        {selectedPeriod === "history" ? (
          <HistoryChart deviceId={deviceId} />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🌱 {selectedPeriod === "day" ? "Daily" : selectedPeriod === "week" ? "Weekly" : selectedPeriod === "month" ? "Monthly" : "Annual"} Operational Data
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-8 h-8 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Total CO₂ Reduction</h3>
                  </div>
                  {loading ? (
                    <div className="animate-pulse h-8 bg-green-200 rounded w-3/4 mb-2"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-green-700">
                        {carbonData?.summary?.total_carbon_saved_kg ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1) : "0"} kg
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedPeriod === "day" ? "Today" : selectedPeriod === "week" ? "Last 7 days" : selectedPeriod === "month" ? `Year ${selectedYear}` : "This year"}
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-lg p-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-8 h-8 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Solar Power System</h3>
                  </div>
                  {loading ? (
                    <div className="animate-pulse h-8 bg-yellow-200 rounded w-3/4 mb-2"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-yellow-700">
                        {carbonData?.summary?.total_solar_generated_kwh ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1) : "0"} kWh
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Energy Capacity</p>
                    </>
                  )}
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-lg p-6">
                  <div className="flex items-center mb-2">
                    <span className="text-3xl mr-2">🌳</span>
                    <h3 className="text-lg font-semibold text-gray-900">Planting Trees</h3>
                  </div>
                  {loading ? (
                    <div className="animate-pulse h-8 bg-emerald-200 rounded w-3/4 mb-2"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-emerald-700">
                        {carbonData?.equivalents?.trees_planted || "0"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Equivalent trees</p>
                    </>
                  )}
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6">
                  <div className="flex items-center mb-2">
                    <span className="text-3xl mr-2">🏠</span>
                    <h3 className="text-lg font-semibold text-gray-900">Households</h3>
                  </div>
                  {loading ? (
                    <div className="animate-pulse h-8 bg-blue-200 rounded w-3/4 mb-2"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-blue-700">
                        {carbonData?.equivalents?.households_powered || "0"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Powering Households</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Carbon Reduction Effect</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl mr-3">🚗</span>
                    <div>
                      <p className="text-sm text-gray-600">Reduce Gasoline Use</p>
                      <p className="text-lg font-semibold">{carbonData?.equivalents?.cars_off_road || "0"} cars/year</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl mr-3">⚫</span>
                    <div>
                      <p className="text-sm text-gray-600">Reduce Coal Use</p>
                      <p className="text-lg font-semibold">{carbonData?.equivalents?.coal_not_burned || "0"} kg</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading ? (
                <>
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-64 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </>
              ) : !chartData || !carbonData ? (
                <div className="col-span-1 lg:col-span-2 bg-white rounded-lg shadow-lg p-12 text-center flex flex-col items-center justify-center">
                  <span className="text-4xl mb-4">🔒</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">데이터 접근 권한 없음</h3>
                  <p className="text-gray-500">
                    해당 기기({deviceId})의 데이터를 볼 수 있는 권한이 없거나, 데이터를 불러오는데 실패했습니다.
                  </p>
                </div>
              ) : (
                <>
                  {selectedPeriod === "day" && (
                    <>
                      <DailyEnergyChart data={chartData} period="day" />
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Daily Operations Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Solar Energy</span>
                            <span className="font-semibold">{carbonData?.summary?.total_solar_generated_kwh ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1) : "0"} kWh</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Carbon Reduction</span>
                            <span className="font-semibold text-green-600">{carbonData?.summary?.total_carbon_saved_kg ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1) : "0"} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Carbon Reduction</span>
                            <span className="font-semibold">{carbonData?.summary?.avg_daily_carbon?.toFixed(1) || "0"} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Solar Energy</span>
                            <span className="font-semibold">{carbonData?.summary?.avg_daily_solar?.toFixed(1) || "0"} kWh</span>
                          </div>
                          <div className="border-t border-gray-200 my-3"></div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Daily CO₂ Savings Summary</h4>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Planting Trees</span>
                            <span className="font-semibold">{carbonData?.equivalents?.trees_planted || "0"} trees</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Powering Households</span>
                            <span className="font-semibold">{carbonData?.equivalents?.households_powered || "0"} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reduce Gasoline Use</span>
                            <span className="font-semibold">{carbonData?.equivalents?.cars_off_road || "0"} cars/year</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reduce Coal Use</span>
                            <span className="font-semibold">{carbonData?.equivalents?.coal_not_burned || "0"} kg</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedPeriod === "week" && (
                    <>
                      <WeeklyTrendChart data={chartData} />
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Weekly Operations Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Solar Energy</span>
                            <span className="font-semibold">{carbonData?.summary?.total_solar_generated_kwh ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1) : "0"} kWh</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Carbon Reduction</span>
                            <span className="font-semibold text-green-600">{carbonData?.summary?.total_carbon_saved_kg ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1) : "0"} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Carbon Reduction</span>
                            <span className="font-semibold">{carbonData?.summary?.avg_daily_carbon?.toFixed(1) || "0"} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Solar Energy</span>
                            <span className="font-semibold">{carbonData?.summary?.avg_daily_solar?.toFixed(1) || "0"} kWh</span>
                          </div>
                          <div className="border-t border-gray-200 my-3"></div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Weekly CO₂ Savings Summary</h4>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Planting Trees</span>
                            <span className="font-semibold">{carbonData?.equivalents?.trees_planted || "0"} trees</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Powering Households</span>
                            <span className="font-semibold">{carbonData?.equivalents?.households_powered || "0"} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reduce Gasoline Use</span>
                            <span className="font-semibold">{carbonData?.equivalents?.cars_off_road || "0"} cars/year</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reduce Coal Use</span>
                            <span className="font-semibold">{carbonData?.equivalents?.coal_not_burned || "0"} kg</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {(selectedPeriod === "month" || selectedPeriod === "year") && (
                    <>
                      <PeriodChart data={chartData} period={selectedPeriod} />
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          {selectedPeriod === "month" ? "Monthly" : "Annual"} Operations Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Solar Energy</span>
                            <span className="font-semibold">{carbonData?.summary?.total_solar_generated_kwh ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1) : "0"} kWh</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Carbon Reduction</span>
                            <span className="font-semibold text-green-600">{carbonData?.summary?.total_carbon_saved_kg ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1) : "0"} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Carbon Reduction</span>
                            <span className="font-semibold">{carbonData?.summary?.avg_daily_carbon?.toFixed(1) || "0"} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Solar Energy</span>
                            <span className="font-semibold">{carbonData?.summary?.avg_daily_solar?.toFixed(1) || "0"} kWh</span>
                          </div>
                          <div className="border-t border-gray-200 my-3"></div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            {selectedPeriod === "month" ? "Monthly" : "Annual"} CO₂ Savings Summary
                          </h4>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Planting Trees</span>
                            <span className="font-semibold">{carbonData?.equivalents?.trees_planted || "0"} trees</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Powering Households</span>
                            <span className="font-semibold">{carbonData?.equivalents?.households_powered || "0"} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reduce Gasoline Use</span>
                            <span className="font-semibold">{carbonData?.equivalents?.cars_off_road || "0"} cars/year</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Reduce Coal Use</span>
                            <span className="font-semibold">{carbonData?.equivalents?.coal_not_burned || "0"} kg</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}

        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-green-800">
                <strong>Carbon Reduction Effect:</strong> Carbon savings generated through
                Giventech's standalone solar power generation system are generated through
                direct use of solar energy and can be used as basis data for trading as a
                potential carbon credit resource.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600">Loading reports...</div>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}