const { Pool } = require('pg');
require('dotenv').config();

// Standardize database connection configuration via pool mapping allocation
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('⚡ PostgreSQL Database pool connected successfully.');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
