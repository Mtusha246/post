import pkg from 'pg';
const { Client } = pkg;

// 🔧 ВСТАВЬ СЮДА свою строку подключения из Railway
const connectionString = 'postgresql://postgres:ПАРОЛЬ@caboose.proxy.rlwy.net:19817/railway';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Railway требует SSL
  },
});

async function init() {
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL');

    // === Создание таблицы posts ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table "posts" ready');

    // === Создание таблицы comments ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table "comments" ready');

    await client.end();
    console.log('🚀 Database initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    await client.end();
  }
}

init();
