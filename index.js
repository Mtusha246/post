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
    origin: 'https://post-production-71c1.up.railway.app',
    credentials: true,
  })
);
app.use(express.static(__dirname));

// === JWT verify helper ===
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.log('❌ Token verify error:', err.message);
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
      secure: true,
      sameSite: 'None',
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

// === CHECK AUTH ===
app.get('/check-auth', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    console.log('🟠 /check-auth → No token');
    return res.json({ authenticated: false });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('🔴 /check-auth → Invalid token');
    return res.json({ authenticated: false });
  }

  console.log('🟢 /check-auth → Authenticated as', decoded.username);
  res.json({ authenticated: true, user: decoded });
});

// === HOME ===
app.get('/', (req, res) => {
  console.log('🍪 Cookies received:', req.cookies);

  const token = req.cookies?.token;
  if (!token) {
    console.log('🟠 No token — redirect to auth');
    return res.sendFile(path.join(__dirname, 'auth.html'));
  }

  const valid = verifyToken(token);
  if (valid) {
    console.log('🟢 Valid token:', valid.username);
    return res.sendFile(path.join(__dirname, 'index.html'));
  }

  console.log('🔴 Invalid token — redirect to auth');
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// === LOGOUT ===
app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    sameSite: 'None',
    secure: true,
    path: '/',
  });
  console.log('🚪 Logout — cookie cleared');
  res.json({ success: true });
});

// === FALLBACK ===
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
