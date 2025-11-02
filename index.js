import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const users = [];
const JWT_SECRET = 'super_secret_key_change_me';

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ CORS fix for Railway HTTPS
app.use(cors({
  origin: 'https://post-production-71c1.up.railway.app', // ← замени, если домен другой
  credentials: true,
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// === REGISTER ===
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (users.find(u => u.username === username || u.email === email)) {
    return res.json({ success: false, error: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, email, password: hashed });
  console.log('✅ Registered:', username);
  res.json({ success: true });
});

// === LOGIN ===
app.post('/login', async (req, res) => {
  const { username, email, password } = req.body;
  const user = users.find(u => u.username === username || u.email === email);

  if (!user) return res.json({ success: false, error: 'User not found' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ success: false, error: 'Invalid password' });

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '2h' });

  // ✅ Cookie fix for HTTPS (Railway)
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,      // <== обязательно для HTTPS
    sameSite: 'none',  // <== чтобы кука передавалась фронту
    maxAge: 2 * 60 * 60 * 1000,
  });

  res.json({ success: true });
});

// === CHECK AUTH ===
app.get('/check-auth', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ authenticated: false });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, user: decoded });
  } catch {
    res.json({ authenticated: false });
  }
});

// === LOGOUT ===
app.post('/logout', (req, res) => {
  res.clearCookie('token', { sameSite: 'none', secure: true });
  res.json({ success: true });
});

// === Protected route ===
app.get('/', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.sendFile(path.join(__dirname, 'public', 'auth.html'));

  try {
    jwt.verify(token, JWT_SECRET);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('🚀 Server running on port', PORT));
