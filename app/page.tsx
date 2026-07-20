"use client";

import { useState, useEffect, Suspense, ChangeEvent } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DailyEnergyChart from "@/components/reports/DailyEnergyChart";
import WeeklyTrendChart from "@/components/reports/WeeklyTrendChart";
import PeriodChart from "@/components/reports/PeriodChart";
import LogoutButton from "@/components/LogoutButton";

function ReportsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [myDevices, setMyDevices] = useState<string[]>([]);
  
  const deviceId = searchParams.get('device_id') || myDevices[0] || process.env.NEXT_PUBLIC_DEVICE_ID || "solar_system_001";

  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [carbonData, setCarbonData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user info when component mounts
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const user = await response.json();
          setUserRole(user.role);

          if (user.devices && user.devices.length > 0) {
            setMyDevices(user.devices);
            
            // 만약 현재 주소창에 device_id가 없다면, 내 첫 번째 기기로 URL 강제 이동
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
    // URL을 변경하면 기존 작성된 useEffect들이 알아서 새 데이터를 Fetch 해옵니다!
    router.push(`${pathname}?device_id=${selectedId}`);
  };

  // Fetch available years when component mounts
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        // 💡 API 호출 시 추출한 deviceId가 자동으로 들어감
        const response = await fetch(`/api/reports/available-years?deviceId=${deviceId}`);
        if (response.ok) {
          const data = await response.json();
          const years = data.years || [];
          if (years.length > 0) {
            setAvailableYears(years);
            if (!years.includes(selectedYear)) {
              setSelectedYear(years[0]);
            }
          } else {
            const currentYear = new Date().getFullYear();
            setAvailableYears([currentYear]);
            setSelectedYear(currentYear);
          }
        } else {
          const currentYear = new Date().getFullYear();
          setAvailableYears([currentYear]);
          setSelectedYear(currentYear);
        }
      } catch (error) {
        console.error("Failed to fetch available years:", error);
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear]);
        setSelectedYear(currentYear);
      }
    };
    fetchAvailableYears();
  }, [deviceId]);

  // Fetch carbon data and chart data from MariaDB
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const carbonResponse = await fetch(
          `/api/reports/carbon?period=${selectedPeriod}&deviceId=${deviceId}`
        );
        const carbonResult = await carbonResponse.json();
        setCarbonData(carbonResult);

        let chartResponse;
        switch (selectedPeriod) {
          case 'day':
            chartResponse = await fetch(`/api/reports/daily?deviceId=${deviceId}`);
            break;
          case 'week':
            chartResponse = await fetch(`/api/reports/weekly?deviceId=${deviceId}`);
            break;
          case 'month':
            chartResponse = await fetch(`/api/reports/monthly?deviceId=${deviceId}&year=${selectedYear}`);
            break;
          case 'year':
            chartResponse = await fetch(`/api/reports/yearly?deviceId=${deviceId}`);
            break;
          default:
            chartResponse = await fetch(`/api/reports/daily?deviceId=${deviceId}`);
        }

        if (chartResponse.ok) {
          const chartResult = await chartResponse.json();
          setChartData(chartResult);
        } else {
          throw new Error(`Chart API failed: ${chartResponse.status}`);
        }

      } catch (error) {
        console.error("Failed to fetch data:", error);

        setCarbonData(null);
        setChartData(null);
        
        // setCarbonData({
        //   summary: {
        //     total_carbon_saved_kg: 150.5,
        //     total_solar_generated_kwh: 315.2,
        //     avg_daily_carbon: 21.5,
        //     avg_daily_solar: 45.0,
        //   },
        //   equivalents: {
        //     trees_planted: 7,
        //     cars_off_road: "0.03",
        //     households_powered: "13.68",
        //     coal_not_burned: "169.10",
        //   },
        // });
        // setChartData(getMockChartData(selectedPeriod));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod, selectedYear, deviceId]);

  // Mock data generator for fallback
  const getMockChartData = (period: string) => {
    switch (period) {
      case 'day':
        return {
          hourly_data: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            timestamp: new Date(Date.now() - (23 - hour) * 60 * 60 * 1000).toISOString(),
            solar_power: hour >= 6 && hour <= 18 ? Math.random() * 3000 + 500 : 0,
            carbon_reduction: hour >= 6 && hour <= 18 ? Math.random() * 1.5 + 0.2 : 0,
          })),
          summary: { total_energy_kwh: 25.4, avg_load_percent: 35.2 }
        };
      case 'week':
        return {
          daily_data: Array.from({ length: 7 }, (_, day) => ({
            date: new Date(Date.now() - (6 - day) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_solar_kwh: Math.random() * 30 + 15,
            carbon_reduction: Math.random() * 15 + 7,
          }))
        };
      case 'month':
        return {
          monthly_data: Array.from({ length: 12 }, (_, month) => ({
            month: `${selectedYear}-${String(month + 1).padStart(2, '0')}`,
            month_name: new Date(selectedYear, month).toLocaleDateString('en', { month: 'short' }),
            total_solar_kwh: 0, 
            carbon_reduction: 0, 
          }))
        };
      case 'year':
        return {
          yearly_data: Array.from({ length: 2 }, (_, index) => ({
            year: 2024 + index,
            total_solar_kwh: Math.random() * 8000 + 4000,
            carbon_reduction: Math.random() * 4000 + 2000,
          }))
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              {/* Empty div for balance */}
            </div>
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="Giventech Logo"
                width={120}
                height={32}
                className="object-contain"
                style={{ height: '32px', width: 'auto' }}
                priority
                unoptimized
              />
              <h1 className="text-2xl font-bold text-gray-900">EMS Dashboard</h1>
            </div>
            <div className="flex-1 flex justify-end items-center gap-4">

              {myDevices.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-600">Device:</span>
                  <select
                    value={deviceId}
                    onChange={handleDeviceChange}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 cursor-pointer"
                  >
                    {myDevices.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {userRole === 'admin' && (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  🛠️ Admin
                </Link>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-600 mt-1">Real-time EMS Monitoring and Control System</p>
          <p className="text-sm font-semibold text-blue-600 mt-1">Target Device: {deviceId}</p>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {["day", "week", "month", "year"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === period
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
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

        {/* Carbon Savings Section */}
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
                    {carbonData?.summary?.total_carbon_saved_kg
                      ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1)
                      : "0"} kg
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedPeriod === "day" ? "Today" :
                     selectedPeriod === "week" ? "Last 7 days" :
                     selectedPeriod === "month" ? `Year ${selectedYear}` : "This year"}
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
                    {carbonData?.summary?.total_solar_generated_kwh
                      ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1)
                      : "0"} kWh
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
                        <span className="font-semibold">
                          {carbonData?.summary?.total_solar_generated_kwh
                            ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1)
                            : "0"} kWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Carbon Reduction</span>
                        <span className="font-semibold text-green-600">
                          {carbonData?.summary?.total_carbon_saved_kg
                            ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1)
                            : "0"} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Carbon Reduction</span>
                        <span className="font-semibold">
                          {carbonData?.summary?.avg_daily_carbon?.toFixed(1) || "0"} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Solar Energy</span>
                        <span className="font-semibold">
                          {carbonData?.summary?.avg_daily_solar?.toFixed(1) || "0"} kWh
                        </span>
                      </div>

                      <div className="border-t border-gray-200 my-3"></div>

                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Daily CO₂ Savings Summary</h4>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Planting Trees</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.trees_planted || "0"} trees
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Powering Households</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.households_powered || "0"} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reduce Gasoline Use</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.cars_off_road || "0"} cars/year
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reduce Coal Use</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.coal_not_burned || "0"} kg
                        </span>
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
                        <span className="font-semibold">
                          {carbonData?.summary?.total_solar_generated_kwh
                            ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1)
                            : "0"} kWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Carbon Reduction</span>
                        <span className="font-semibold text-green-600">
                          {carbonData?.summary?.total_carbon_saved_kg
                            ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1)
                            : "0"} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Carbon Reduction</span>
                        <span className="font-semibold">
                          {carbonData?.summary?.avg_daily_carbon?.toFixed(1) || "0"} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Solar Energy</span>
                        <span className="font-semibold">
                          {carbonData?.summary?.avg_daily_solar?.toFixed(1) || "0"} kWh
                        </span>
                      </div>

                      <div className="border-t border-gray-200 my-3"></div>

                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Weekly CO₂ Savings Summary</h4>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Planting Trees</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.trees_planted || "0"} trees
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Powering Households</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.households_powered || "0"} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reduce Gasoline Use</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.cars_off_road || "0"} cars/year
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reduce Coal Use</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.coal_not_burned || "0"} kg
                        </span>
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
                        <span className="font-semibold">
                          {carbonData?.summary?.total_solar_generated_kwh
                            ? parseFloat(carbonData.summary.total_solar_generated_kwh).toFixed(1)
                            : "0"} kWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Carbon Reduction</span>
                        <span className="font-semibold text-green-600">
                          {carbonData?.summary?.total_carbon_saved_kg
                            ? parseFloat(carbonData.summary.total_carbon_saved_kg).toFixed(1)
                            : "0"} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Carbon Reduction</span>
                        <span className="font-semibold">
                          {carbonData?.summary?.avg_daily_carbon?.toFixed(1) || "0"} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Solar Energy</span>
                        <span className="font-semibold">
                          {carbonData?.summary?.avg_daily_solar?.toFixed(1) || "0"} kWh
                        </span>
                      </div>

                      <div className="border-t border-gray-200 my-3"></div>

                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        {selectedPeriod === "month" ? "Monthly" : "Annual"} CO₂ Savings Summary
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Planting Trees</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.trees_planted || "0"} trees
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Powering Households</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.households_powered || "0"} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reduce Gasoline Use</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.cars_off_road || "0"} cars/year
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reduce Coal Use</span>
                        <span className="font-semibold">
                          {carbonData?.equivalents?.coal_not_burned || "0"} kg
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

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