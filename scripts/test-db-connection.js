const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  const dbConfig = {
    host: '118.45.181.229',
    port: 3306,
    user: 'root',
    password: 'Qusrud8545!!@@',
    database: 'mysolar',
  };

  try {
    console.log('🔄 Connecting to MariaDB...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!\n');

    // 1. Test table structure
    console.log('📊 Checking table structure...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:', tables.map(t => Object.values(t)[0]));

    // 2. Check raw_inverter_data columns
    const [columns] = await connection.execute('DESCRIBE raw_inverter_data');
    console.log('\n📋 raw_inverter_data columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // 3. Check data statistics
    console.log('\n📈 Data Statistics:');

    // Total records
    const [totalRecords] = await connection.execute(
      'SELECT COUNT(*) as total FROM raw_inverter_data'
    );
    console.log(`  Total records: ${totalRecords[0].total}`);

    // Date range
    const [dateRange] = await connection.execute(
      'SELECT MIN(timestamp) as first_date, MAX(timestamp) as last_date FROM raw_inverter_data'
    );
    console.log(`  Date range: ${dateRange[0].first_date} to ${dateRange[0].last_date}`);

    // Device IDs
    const [devices] = await connection.execute(
      'SELECT DISTINCT device_id FROM raw_inverter_data'
    );
    console.log(`  Devices: ${devices.map(d => d.device_id).join(', ')}`);

    // 4. Sample data
    console.log('\n🔍 Sample Data (Latest 5 records):');
    const [sampleData] = await connection.execute(
      `SELECT
        device_id,
        timestamp,
        pv1_charging_power,
        battery_capacity,
        ac_voltage,
        battery_voltage,
        solar_kwh,
        carbon_reduction
      FROM raw_inverter_data
      ORDER BY timestamp DESC
      LIMIT 5`
    );

    sampleData.forEach(row => {
      console.log('---');
      console.log(`  Time: ${row.timestamp}`);
      console.log(`  Solar Power: ${row.pv1_charging_power}W`);
      console.log(`  Battery: ${row.battery_capacity}%`);
      console.log(`  Generator (AC): ${row.ac_voltage}V`);
      console.log(`  Battery Voltage: ${row.battery_voltage}V`);
      console.log(`  Solar kWh: ${row.solar_kwh}`);
      console.log(`  Carbon Reduction: ${row.carbon_reduction}`);
    });

    // 5. Test calculations
    console.log('\n🧮 Testing Calculations:');

    // Today's solar generation
    const [todayData] = await connection.execute(
      `SELECT
        DATE(timestamp) as date,
        COUNT(*) as data_points,
        SUM(LEAST(pv1_charging_power, 3000) / 1000 * (1/120)) as total_solar_kwh,
        SUM(LEAST(pv1_charging_power, 3000) / 1000 * (1/120) * 0.4781) as carbon_saved_kg,
        AVG(battery_capacity) as avg_battery,
        MAX(pv1_charging_power) as max_solar_power
      FROM raw_inverter_data
      WHERE DATE(timestamp) = CURDATE()
      GROUP BY DATE(timestamp)`
    );

    if (todayData.length > 0) {
      const today = todayData[0];
      console.log(`  Today (${today.date}):`);
      console.log(`    - Data points: ${today.data_points} (${Math.round(today.data_points/2)} minutes)`);
      console.log(`    - Solar Generated: ${today.total_solar_kwh?.toFixed(2) || 0} kWh`);
      console.log(`    - Carbon Saved: ${today.carbon_saved_kg?.toFixed(2) || 0} kg CO₂`);
      console.log(`    - Avg Battery: ${today.avg_battery?.toFixed(1) || 0}%`);
      console.log(`    - Max Solar Power: ${today.max_solar_power || 0}W`);
      console.log(`    - System Efficiency: ${((today.total_solar_kwh || 0) / 12 * 100).toFixed(1)}%`);
    } else {
      console.log('  No data for today');
    }

    // Weekly summary
    const [weekData] = await connection.execute(
      `SELECT
        COUNT(DISTINCT DATE(timestamp)) as days_with_data,
        SUM(LEAST(pv1_charging_power, 3000) / 1000 * (1/120)) as total_solar_kwh,
        SUM(LEAST(pv1_charging_power, 3000) / 1000 * (1/120) * 0.4781) as carbon_saved_kg
      FROM raw_inverter_data
      WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    const week = weekData[0];
    console.log(`\n  Last 7 Days:`);
    console.log(`    - Days with data: ${week.days_with_data}`);
    console.log(`    - Total Solar: ${week.total_solar_kwh?.toFixed(2) || 0} kWh`);
    console.log(`    - Total Carbon Saved: ${week.carbon_saved_kg?.toFixed(2) || 0} kg CO₂`);
    console.log(`    - Trees Equivalent: ${Math.round((week.carbon_saved_kg || 0) / 21)} trees/year`);

    // 6. Check for data issues
    console.log('\n⚠️  Data Quality Check:');

    // Check for null values
    const [nullCheck] = await connection.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN pv1_charging_power IS NULL THEN 1 ELSE 0 END) as null_solar,
        SUM(CASE WHEN battery_capacity IS NULL THEN 1 ELSE 0 END) as null_battery,
        SUM(CASE WHEN timestamp IS NULL THEN 1 ELSE 0 END) as null_timestamp
      FROM raw_inverter_data`
    );

    const nc = nullCheck[0];
    console.log(`  NULL values:`);
    console.log(`    - Solar Power: ${nc.null_solar} (${(nc.null_solar/nc.total*100).toFixed(1)}%)`);
    console.log(`    - Battery: ${nc.null_battery} (${(nc.null_battery/nc.total*100).toFixed(1)}%)`);
    console.log(`    - Timestamp: ${nc.null_timestamp}`);

    // Check for unrealistic values
    const [valueCheck] = await connection.execute(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN pv1_charging_power > 3000 THEN 1 ELSE 0 END) as over_capacity,
        SUM(CASE WHEN battery_capacity > 100 THEN 1 ELSE 0 END) as over_100_battery,
        SUM(CASE WHEN pv1_charging_power < 0 THEN 1 ELSE 0 END) as negative_power
      FROM raw_inverter_data`
    );

    const vc = valueCheck[0];
    console.log(`\n  Data validation:`);
    console.log(`    - Solar > 3kW: ${vc.over_capacity} records (should be capped)`);
    console.log(`    - Battery > 100%: ${vc.over_100_battery} records`);
    console.log(`    - Negative power: ${vc.negative_power} records`);

    await connection.end();
    console.log('\n✅ Database test completed successfully!');

  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
}

testDatabaseConnection();