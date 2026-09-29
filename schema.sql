CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255), -- Nullable to allow passwordless Google Accounts
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6),
  verification_expires TIMESTAMP,
  reset_token VARCHAR(64),
  reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
