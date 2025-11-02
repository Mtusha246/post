const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;
const SECRET = process.env.JWT_SECRET || 'supersecret';

// ---- лог запросов ----
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- middleware ----
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  })
);

// ---- статика прямо из корня ----
app.use(express.static(__dirname));

// ---- favicon ----
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ---- Проверка токена ----
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// ---- API логин ----
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 👇 Простейшая проверка (позже можно заменить на реальную)
  if (username === 'admin' && password === '1234') {
    const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// ---- Главная страница ----
app.get('/', (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    console.log('🟠 Нет токена — показываю auth.html');
    return res.sendFile(path.join(__dirname, 'auth.html'));
  }

  const valid = verifyToken(token);
  if (valid) {
    console.log('🟢 Валидный токен — показываю index.html');
    return res.sendFile(path.join(__dirname, 'index.html'));
  }

  console.log('🔴 Невалидный токен — показываю auth.html');
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// ---- logout ----
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// ---- fallback ----
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// ---- запуск ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
