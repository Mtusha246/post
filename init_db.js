const { Client } = require('pg');

const connectionString = 'postgresql://postgres:gjbLXHghHdItlgjBWudmyhfESlrbsPke@caboose.proxy.rlwy.net:19817/railway';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  try {
    await client.connect();
    console.log('✅ Connected to Railway Postgres');

    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created successfully');
  } catch (err) {
    console.error('❌ Error initializing DB:', err);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

init();
