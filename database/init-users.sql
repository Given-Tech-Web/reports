-- Create users table if not exists
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100),
  `role` VARCHAR(20) DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for username
CREATE INDEX IF NOT EXISTS idx_username ON users(username);

-- Insert default admin user if not exists
-- Password: admin123 (bcrypt hashed)
INSERT IGNORE INTO users (id, username, password, name, role) VALUES
('admin-001', 'admin', '$2b$10$4MbTJw1Yx.eKdx8D73KeCu1.KOMSpzidg9aAno8EQd0JvPMs06ztq', '관리자', 'admin');