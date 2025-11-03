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

    // === USERS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        verified BOOLEAN DEFAULT false,
        verification_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === POSTS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === COMMENTS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === FRIEND REQUESTS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (from_user_id, to_user_id)
      );
    `);

    // === FRIENDSHIPS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        friend_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, friend_user_id)
      );
    `);

    // === MESSAGES ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created successfully (users + posts + comments + friends + messages)');
  } catch (err) {
    console.error('❌ Error initializing DB:', err);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

init();
