/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

interface EnvConfig {
  // Database Configuration
  MARIADB_HOST: string;
  MARIADB_PORT: string;
  MARIADB_USER: string;
  MARIADB_PASSWORD: string;
  MARIADB_DATABASE: string;

  // Optional Configuration
  DB_CONNECTION_LIMIT?: string;
  DB_QUEUE_LIMIT?: string;

  // Application Configuration
  NEXT_PUBLIC_DEVICE_ID?: string;
  JWT_SECRET?: string;
}

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validates all environment variables
   */
  public validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    this.errors = [];
    this.warnings = [];

    // Check required database variables
    this.validateRequired('MARIADB_HOST', 'Database host');
    this.validateRequired('MARIADB_USER', 'Database user');
    this.validateRequired('MARIADB_PASSWORD', 'Database password');
    this.validateRequired('MARIADB_DATABASE', 'Database name');

    // Validate port is a number
    this.validatePort('MARIADB_PORT', 'Database port', '3306');

    // Check optional numeric variables
    if (process.env.DB_CONNECTION_LIMIT) {
      this.validateNumber('DB_CONNECTION_LIMIT', 'Database connection limit');
    }

    if (process.env.DB_QUEUE_LIMIT) {
      this.validateNumber('DB_QUEUE_LIMIT', 'Database queue limit');
    }

    // Check JWT secret for production
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      this.errors.push('JWT_SECRET is required in production');
    }

    // Warnings for optional but recommended variables
    if (!process.env.NEXT_PUBLIC_DEVICE_ID) {
      this.warnings.push('NEXT_PUBLIC_DEVICE_ID not set, using default: solar_system_001');
    }

    if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
      this.warnings.push('JWT_SECRET not set, using default for development');
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validates a required environment variable
   */
  private validateRequired(key: string, description: string): void {
    if (!process.env[key]) {
      this.errors.push(`${description} (${key}) is required but not set`);
    }
  }

  /**
   * Validates a port number
   */
  private validatePort(key: string, description: string, defaultValue: string): void {
    const value = process.env[key] || defaultValue;
    const port = parseInt(value);

    if (isNaN(port) || port < 1 || port > 65535) {
      this.errors.push(`${description} (${key}) must be a valid port number (1-65535)`);
    }
  }

  /**
   * Validates a numeric value
   */
  private validateNumber(key: string, description: string): void {
    const value = process.env[key];

    if (value && isNaN(parseInt(value))) {
      this.errors.push(`${description} (${key}) must be a valid number`);
    }
  }
}

/**
 * Gets validated environment configuration
 */
export function getEnvConfig(): Partial<EnvConfig> {
  return {
    MARIADB_HOST: process.env.MARIADB_HOST || '220.69.222.151',
    MARIADB_PORT: process.env.MARIADB_PORT || '3306',
    MARIADB_USER: process.env.MARIADB_USER || 'root',
    MARIADB_PASSWORD: process.env.MARIADB_PASSWORD || 'utonics-giventech',
    MARIADB_DATABASE: process.env.MARIADB_DATABASE || 'mysolar',
    DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT || '10',
    DB_QUEUE_LIMIT: process.env.DB_QUEUE_LIMIT || '0',
    NEXT_PUBLIC_DEVICE_ID: process.env.NEXT_PUBLIC_DEVICE_ID || 'solar_system_001',
    JWT_SECRET: process.env.JWT_SECRET
  };
}

/**
 * Validates environment variables on startup
 * Logs warnings and throws errors if required variables are missing
 */
export function validateEnvironment(): void {
  const validator = new EnvironmentValidator();
  const { isValid, errors, warnings } = validator.validate();

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Throw error if validation fails
  if (!isValid) {
    console.error('❌ Environment variable validation failed:');
    errors.forEach(error => console.error(`   - ${error}`));

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed. Please check your environment variables.');
    } else {
      console.warn('⚠️  Continuing with defaults in development mode...');
    }
  } else {
    console.log('✅ Environment variables validated successfully');
  }
}

// Auto-validate on import in development
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  validateEnvironment();
}

export default { getEnvConfig, validateEnvironment };