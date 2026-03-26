// Script to close all months for 2024 and 2025
async function closeMonthly(year, month) {
  try {
    const response = await fetch('http://localhost:3000/api/reports/monthly-closing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: year,
        month: month,
        deviceId: 'solar_system_001'
      })
    });

    const result = await response.json();

    if (result.success) {
      const summary = result.summary;
      console.log(`✅ ${year}-${String(month).padStart(2, '0')}: ${summary.total_energy_kwh.toFixed(2)} kWh (${summary.days_operated} days)`);
      return { year, month, success: true, energy: summary.total_energy_kwh, days: summary.days_operated };
    } else {
      console.log(`⚠️  ${year}-${String(month).padStart(2, '0')}: ${result.message}`);
      return { year, month, success: false, message: result.message };
    }
  } catch (error) {
    console.log(`❌ ${year}-${String(month).padStart(2, '0')}: ${error.message}`);
    return { year, month, success: false, error: error.message };
  }
}

async function closeAllMonths() {
  console.log('🚀 Starting monthly closing for 2024-2025...\n');

  const results = [];
  let total2024 = 0;
  let total2025 = 0;

  // Close 2024 months (1-12)
  console.log('📅 Processing 2024...');
  for (let month = 1; month <= 12; month++) {
    const result = await closeMonthly(2024, month);
    results.push(result);
    if (result.success && result.energy) {
      total2024 += result.energy;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n📅 Processing 2025...');
  // Close 2025 months (1-10)
  for (let month = 1; month <= 10; month++) {
    const result = await closeMonthly(2025, month);
    results.push(result);
    if (result.success && result.energy) {
      total2025 += result.energy;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n📊 Summary:');
  console.log(`Total months processed: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`\n2024 Total Energy: ${total2024.toFixed(2)} kWh`);
  console.log(`2025 Total Energy: ${total2025.toFixed(2)} kWh`);
}

closeAllMonths().then(() => {
  console.log('\n✨ Monthly closing complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
