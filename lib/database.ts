import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// Validate required environment variables
const requiredEnvVars = ['MARIADB_HOST', 'MARIADB_USER', 'MARIADB_PASSWORD', 'MARIADB_DATABASE'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Database configuration with environment variables (no hardcoded defaults in production)
const dbConfig: PoolOptions = {
  host: process.env.MARIADB_HOST,
  port: parseInt(process.env.MARIADB_PORT || '3306'),
  user: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  database: process.env.MARIADB_DATABASE,
  timezone: '+00:00',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Connection timeout and retry settings
  connectTimeout: 60000,
  // Enable connection pooling optimizations
  multipleStatements: false,
  dateStrings: true,
  decimalNumbers: true
};

// Singleton pattern for database pool
class Database {
  private static instance: Database;
  private pool: Pool | null = null;
  private isConnecting: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private async createPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.pool) {
        return this.pool;
      }
    }

    this.isConnecting = true;
    try {
      console.log('Creating new database connection pool...');
      this.pool = mysql.createPool(dbConfig);

      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      console.log('Database connection pool created successfully');
      return this.pool;
    } catch (error) {
      console.error('Failed to create database connection pool:', error);
      this.pool = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public async getPool(): Promise<Pool> {
    if (!this.pool) {
      return await this.createPool();
    }
    return this.pool;
  }

  public async query<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    params?: any[]
  ): Promise<T> {
    const pool = await this.getPool();
    try {
      const [results] = await pool.execute<T>(sql, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const pool = await this.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database connection pool closed');
    }
  }

  // Helper method to get pool statistics
  public async getPoolStats(): Promise<{
    total: number;
    active: number;
    idle: number;
    waiting: number;
  }> {
    const pool = await this.getPool();
    // Type assertion for accessing private properties
    const poolInternal = pool as any;
    return {
      total: poolInternal._allConnections?.length || 0,
      active: poolInternal._busyConnections?.length || 0,
      idle: poolInternal._freeConnections?.length || 0,
      waiting: poolInternal._connectionQueue?.length || 0
    };
  }
}

// Export singleton instance
export const db = Database.getInstance();

// Type definitions for database results
export interface InverterData extends RowDataPacket {
  id: number;
  device_id: string;
  timestamp: Date;
  pv1_charging_power: number;
  battery_capacity: number;
  solar_kwh?: number;
  carbon_reduction?: number;
  [key: string]: any;
}

export interface DailyStats extends RowDataPacket {
  date: string;
  hour?: number;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
  data_points?: number;
}

export interface MonthlyStats extends RowDataPacket {
  month: string;
  month_name?: string;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
  generator_hours?: number;
}

export interface YearlyStats extends RowDataPacket {
  year: number;
  total_solar_kwh: number;
  carbon_reduction: number;
  avg_battery_capacity: number;
  peak_power: number;
  records_count?: number;
}

export interface CarbonEquivalents {
  trees_planted: number;
  cars_off_road: string;
  households_powered: string;
  coal_not_burned: string;
}

// Utility functions
export function calculateCarbonEquivalents(carbonKg: number): CarbonEquivalents {
  return {
    trees_planted: Math.round(carbonKg / 21),
    cars_off_road: (carbonKg / 4600).toFixed(2),
    households_powered: (carbonKg / 11).toFixed(2),
    coal_not_burned: (carbonKg / 0.89).toFixed(2)
  };
}

// System constants
export const CARBON_FACTOR = 0.4781; // kg CO2 per kWh (Korea)
export const DATA_INTERVAL = 1 / 120; // 30 seconds = 1/120 hour
export const MAX_SOLAR_POWER = 3000; // 3kW system limit
export const BATTERY_CAPACITY = 19.2; // 19.2 kWh total battery capacity