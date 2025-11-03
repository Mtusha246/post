// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:gjbLXHghHdItlgjBWudmyhfESlrbsPke@caboose.proxy.rlwy.net:19817/railway',
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log('✅ Connected to PostgreSQL via db.js'))
  .catch(err => console.error('❌ DB connection error:', err.message));

module.exports = pool;
