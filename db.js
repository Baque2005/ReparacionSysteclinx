const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : undefined,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;