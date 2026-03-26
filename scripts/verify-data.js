// Data verification script
async function verifyData() {
  console.log('🔍 Data Verification Report\n');
  console.log('='.repeat(60));

  try {
    // Check yearly data
    const yearlyResponse = await fetch('http://localhost:3000/api/reports/yearly');
    const yearlyData = await yearlyResponse.json();

    console.log('\n📊 Yearly Data (from monthly_inverter_stats):');
    console.log('-'.repeat(60));
    yearlyData.yearly_data.forEach(year => {
      console.log(`${year.year}: ${year.total_solar_kwh.toFixed(2)} kWh (${year.records_count} days)`);
    });

    // Check 2025 monthly data
    const monthlyResponse = await fetch('http://localhost:3000/api/reports/monthly?year=2025');
    const monthlyData = await monthlyResponse.json();

    console.log('\n📅 2025 Monthly Data (from monthly_inverter_stats):');
    console.log('-'.repeat(60));

    let total2025 = 0;
    monthlyData.monthly_data.forEach(month => {
      if (month.total_solar_kwh > 0) {
        console.log(`${month.month}: ${month.total_solar_kwh.toFixed(2)} kWh (${month.days_with_data} days)`);
        total2025 += month.total_solar_kwh;
      }
    });

    console.log('-'.repeat(60));
    console.log(`2025 Total (sum of months): ${total2025.toFixed(2)} kWh`);

    // Check September specifically
    const septemberData = monthlyData.monthly_data.find(m => m.month === '2025-09');

    console.log('\n✅ September 2025 Verification:');
    console.log('-'.repeat(60));
    console.log(`Energy: ${septemberData.total_solar_kwh.toFixed(2)} kWh`);
    console.log(`Carbon: ${septemberData.carbon_reduction.toFixed(2)} kg`);
    console.log(`Days: ${septemberData.days_with_data}`);
    console.log(`Avg Daily: ${septemberData.avg_daily_generation.toFixed(2)} kWh`);

    // Check monthly closing status
    const closingResponse = await fetch('http://localhost:3000/api/reports/monthly-closing?year=2025&month=9');
    const closingData = await closingResponse.json();

    console.log('\n🔒 September Monthly Closing Status:');
    console.log('-'.repeat(60));
    console.log(`Closed: ${closingData.is_closed ? 'Yes ✅' : 'No ❌'}`);
    if (closingData.closed_data) {
      console.log(`Stored Energy: ${parseFloat(closingData.closed_data.total_energy_generated).toFixed(2)} kWh`);
      console.log(`Stored Carbon: ${parseFloat(closingData.closed_data.total_carbon_reduction).toFixed(2)} kg`);
      console.log(`Days Operated: ${closingData.closed_data.days_operated}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Verification Complete!');

    // Consistency check
    const yearlyMatch = Math.abs(total2025 - yearlyData.yearly_data[0].total_solar_kwh) < 0.01;
    const closingMatch = Math.abs(septemberData.total_solar_kwh - parseFloat(closingData.closed_data.total_energy_generated)) < 0.01;

    console.log('\n🎯 Consistency Checks:');
    console.log(`Yearly vs Monthly Sum: ${yearlyMatch ? '✅ Match' : '❌ Mismatch'}`);
    console.log(`September API vs Closing: ${closingMatch ? '✅ Match' : '❌ Mismatch'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyData().then(() => process.exit(0)).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
