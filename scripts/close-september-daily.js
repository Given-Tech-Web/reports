// Script to close all days in September 2025
const dates = [
  '2025-09-09', '2025-09-10', '2025-09-11', '2025-09-12', '2025-09-13',
  '2025-09-14', '2025-09-15', '2025-09-16', '2025-09-17', '2025-09-18',
  '2025-09-19', '2025-09-20', '2025-09-21', '2025-09-22', '2025-09-23',
  '2025-09-24', '2025-09-25', '2025-09-26', '2025-09-27', '2025-09-28',
  '2025-09-29', '2025-09-30'
];

async function closeDailyForDate(date) {
  try {
    const response = await fetch('http://localhost:3000/api/reports/daily-closing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: date,
        deviceId: 'solar_system_001'
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ ${date}: ${result.summary.total_energy_kwh.toFixed(4)} kWh`);
      return { date, success: true, energy: result.summary.total_energy_kwh };
    } else {
      console.log(`⚠️  ${date}: ${result.message}`);
      return { date, success: false, message: result.message };
    }
  } catch (error) {
    console.log(`❌ ${date}: ${error.message}`);
    return { date, success: false, error: error.message };
  }
}

async function closeAllDays() {
  console.log('🚀 Starting daily closing for September 2025...\n');

  const results = [];
  let totalEnergy = 0;

  for (const date of dates) {
    const result = await closeDailyForDate(date);
    results.push(result);

    if (result.success && result.energy) {
      totalEnergy += result.energy;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 Summary:');
  console.log(`Total days processed: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Total Energy: ${totalEnergy.toFixed(4)} kWh`);
}

closeAllDays().then(() => {
  console.log('\n✨ Daily closing complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
