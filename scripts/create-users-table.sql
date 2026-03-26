-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
);

-- Insert a default admin user (password: admin123)
-- Password is hashed using bcrypt
INSERT IGNORE INTO users (username, password, name) VALUES
('admin', '$2a$10$YourHashedPasswordHere', 'Administrator');