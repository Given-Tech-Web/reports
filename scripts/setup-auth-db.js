const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupAuthDatabase() {
  const connection = await mysql.createConnection({
    host: '118.45.181.229',
    port: 3306,
    user: 'root',
    password: 'Qusrud8545!!@@',
    database: 'mysolar',
  });

  try {
    console.log('Creating users table...');

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      )
    `);

    console.log('Users table created successfully!');

    // Check if admin user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );

    if (existing.length === 0) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await connection.execute(
        'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'Administrator']
      );

      console.log('Default admin user created:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
    } else {
      console.log('Admin user already exists');
    }

    // Create a regular test user
    const [testUser] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      ['user']
    );

    if (testUser.length === 0) {
      const hashedPassword = await bcrypt.hash('user123', 10);

      await connection.execute(
        'INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
        ['user', hashedPassword, 'Regular User']
      );

      console.log('Test user created:');
      console.log('  Username: user');
      console.log('  Password: user123');
    }

    console.log('\nSetup completed successfully!');

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await connection.end();
  }
}

setupAuthDatabase();