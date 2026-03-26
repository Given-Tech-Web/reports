// System Specifications for MySolar
export const SYSTEM_SPECS = {
  // Solar PV System
  solar: {
    totalCapacity: 3000, // 3kW total capacity
    panelCapacity: 500, // 500Wp per panel
    numberOfPanels: 6, // 6 panels
    maxDailyGeneration: 12, // 3kW * 4 peak sun hours = 12kWh theoretical max per day
  },

  // Generator System
  generator: {
    ratedPower: 6500, // 6.5kW rated power
    minPower: 5500, // 5.5kVA minimum
    maxPower: 6500, // 6.5kVA maximum
    nominalVoltage: 220, // 220V nominal
    frequency: 60, // 60Hz
  },

  // Battery System
  battery: {
    totalCapacity: 19000, // 19kWh total capacity
    voltage: 12, // 12VDC per battery
    ampHours: 200, // 200Ah per battery
    numberOfBatteries: 8, // 8 batteries in series/parallel
    usableCapacity: 15200, // 80% DOD = 15.2kWh usable
    maxChargingPower: 3000, // Max charging power in watts
  },

  // Carbon Emissions
  carbon: {
    emissionFactor: 0.4781, // kg CO₂ per kWh (Korea grid average)
    treeAbsorption: 21, // 1 tree absorbs ~21kg CO₂/year
    carEmission: 4600, // Average car emits ~4,600kg CO₂/year
    householdDaily: 11, // 11kg CO₂ = 1 household/day
    coalFactor: 0.89, // 1kg coal = 0.89kg CO₂
  },

  // Cost Savings (KRW)
  cost: {
    electricityRate: 120, // KRW per kWh (average rate)
    peakRate: 180, // KRW per kWh (peak time rate)
    generatorFuelCost: 1500, // KRW per liter diesel
    generatorConsumption: 2.5, // liters per hour at full load
  },
};

// Helper functions for calculations
export const calculateBatteryKwh = (batteryPercentage: number): number => {
  return (batteryPercentage / 100) * SYSTEM_SPECS.battery.totalCapacity / 1000;
};

export const calculateUsableBatteryKwh = (batteryPercentage: number): number => {
  return (batteryPercentage / 100) * SYSTEM_SPECS.battery.usableCapacity / 1000;
};

export const calculateSolarEfficiency = (actualPower: number): number => {
  return (actualPower / SYSTEM_SPECS.solar.totalCapacity) * 100;
};

export const calculateCarbonSaved = (solarKwh: number): number => {
  return solarKwh * SYSTEM_SPECS.carbon.emissionFactor;
};

export const calculateTreesEquivalent = (carbonKg: number): number => {
  return carbonKg / SYSTEM_SPECS.carbon.treeAbsorption;
};

export const calculateCarsOffRoad = (carbonKg: number): number => {
  return carbonKg / SYSTEM_SPECS.carbon.carEmission;
};

export const calculateHouseholdsPowered = (carbonKg: number): number => {
  return carbonKg / SYSTEM_SPECS.carbon.householdDaily;
};

export const calculateCoalNotBurned = (carbonKg: number): number => {
  return carbonKg / SYSTEM_SPECS.carbon.coalFactor;
};

export const calculateCostSavings = (solarKwh: number, isPeakTime: boolean = false): number => {
  const rate = isPeakTime ? SYSTEM_SPECS.cost.peakRate : SYSTEM_SPECS.cost.electricityRate;
  return solarKwh * rate;
};

export const calculateGeneratorFuelSaved = (generatorHoursAvoided: number): number => {
  const fuelSaved = generatorHoursAvoided * SYSTEM_SPECS.generator.ratedPower / 1000 * 0.3; // 0.3L per kWh estimate
  return fuelSaved * SYSTEM_SPECS.cost.generatorFuelCost;
};