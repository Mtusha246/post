const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// === PostgreSQL ===
const client = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:gjbLXHghHdItlgjBWudmyhfESlrbsPke@caboose.proxy.rlwy.net:19817/railway',
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(() => console.log('✅ Connected to Railway DB'))
  .catch(console.error);

// === Middleware ===
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.static(__dirname));

// === JWT ===
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// === REGISTER ===
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ success: false, error: 'All fields required' });

  try {
    const existing = await client.query(
      'SELECT * FROM users WHERE username=$1 OR email=$2',
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO users (username, email, password, verified)
       VALUES ($1, $2, $3, true)`,
      [username, email, hash]
    );

    console.log('✅ Registered:', username);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// === LOGIN ===
app.post('/login', async (req, res) => {
  const { username, email, password } = req.body;
  const identifier = username || email;

  if (!identifier || !password)
    return res.status(400).json({ success: false, error: 'Username/email and password required' });

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE username=$1 OR email=$1',
      [identifier]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', identifier);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      console.log('❌ Invalid password for:', identifier);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 2 * 60 * 60 * 1000,
    });

    console.log('✅ Login success:', identifier);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// === HOME ===
app.get('/', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    console.log('🟠 No token — auth page');
    return res.sendFile(path.join(__dirname, 'auth.html'));
  }

  const valid = verifyToken(token);
  if (valid) {
    console.log('🟢 Valid token — index page');
    return res.sendFile(path.join(__dirname, 'index.html'));
  }

  console.log('🔴 Invalid token — auth page');
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// === LOGOUT ===
app.post('/logout', (req, res) => {
  res.clearCookie('token', { sameSite: 'none', secure: true, path: '/' });
  res.json({ success: true });
});

// === FALLBACK ===
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// === START ===
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
