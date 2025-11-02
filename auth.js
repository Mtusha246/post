// auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const router = express.Router();

// === подключение к PostgreSQL ===
const client = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:gjbLXHghHdItlgjBWudmyhfESlrbsPke@caboose.proxy.rlwy.net:19817/railway',
  ssl: { rejectUnauthorized: false },
});

client.connect();

// === секрет для JWT ===
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

// === регистрация ===
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const existing = await client.query('SELECT * FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2, 15);

    await client.query(
      `INSERT INTO users (username, email, password, verified, verification_token)
       VALUES ($1, $2, $3, $4, $5)`,
      [username, email, hash, true, verificationToken]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === логин по USERNAME ===
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = await client.query('SELECT * FROM users WHERE username=$1', [username]);
    if (result.rows.length === 0) {
      console.log('⚠️  User not found for username:', username);
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    console.log('🔎 User found in DB:', user);

    const valid = await bcrypt.compare(password, user.password);
    console.log('🔵 bcrypt.compare result:', valid);

    if (!valid)
      return res.status(401).json({ error: 'Invalid password' });

    if (!user.verified) {
      console.log('🚫 User not verified');
      return res.status(403).json({ error: 'Email not verified' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // === ставим cookie с токеном ===
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // поставь true, если у тебя HTTPS
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    console.log('✅ Login successful for user:', username);
    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
