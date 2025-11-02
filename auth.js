const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Client } = require('pg');

const app = express();
app.use(express.json());
app.use(cookieParser());

// === подключение к PostgreSQL ===
const client = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:gjbLXHghHdItlgjBWudmyhfESlrbsPke@caboose.proxy.rlwy.net:19817/railway',
  ssl: { rejectUnauthorized: false },
});

client.connect().then(() => console.log('✅ PostgreSQL connected'));

// === секрет для JWT ===
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

// === регистрация ===
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const existing = await client.query(
      'SELECT * FROM users WHERE email=$1 OR username=$2',
      [email, username]
    );

    if (existing.rows.length > 0)
      return res.status(400).json({ error: 'Email or username already registered' });

    // ✅ хэшируем пароль перед сохранением
    const hash = await bcrypt.hash(password, 10);

    await client.query(
      `INSERT INTO users (username, email, password, verified)
       VALUES ($1, $2, $3, $4)`,
      [username, email, hash, true]
    );

    console.log('✅ Registered new user:', username);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === логин ===
app.post('/login', async (req, res) => {
  const { username, email, password } = req.body;

  if ((!username && !email) || !password)
    return res.status(400).json({ error: 'Username/email and password required' });

  try {
    console.log('🧠 Login attempt:', { username, email });

    const result = await client.query(
      'SELECT * FROM users WHERE username=$1 OR email=$2',
      [username, email]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];

    // ✅ сравниваем пароль с хэшем
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // ✅ создаём токен для конкретного пользователя
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // ✅ сохраняем токен в cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 2 * 60 * 60 * 1000, // 2 часа
    });

    console.log('✅ Login success:', user.username);
    res.json({ success: true, user: { username: user.username, email: user.email } });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// === проверка токена ===
app.get('/check-auth', (req, res) => {
  const token = req.cookies.token;
  console.log('🍪 Cookies received:', req.cookies);

  if (!token) return res.json({ authenticated: false });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔑 Token valid for:', decoded.username);
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    console.log('❌ Invalid token:', err.message);
    res.json({ authenticated: false });
  }
});

// === логаут ===
app.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  console.log('🚪 Logged out');
  res.json({ success: true });
});

// === запуск сервера ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
