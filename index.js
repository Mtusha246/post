const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { verifyToken } = require('./authMiddleware');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');
const authRouter = require('./auth');

const app = express();
const PORT = process.env.PORT || 8080;

// ---- лог запросов ----
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- middleware ----
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
}));

// ---- статика прямо из корня ----
app.use(express.static(__dirname));

// ---- favicon ----
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ---- API ----
app.use('/auth', authRouter);
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// ---- Главная страница ----
// если нет токена → auth.html
// если токен есть и валиден → index.html
app.get('/', (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    console.log('🟠 Нет токена, показываю auth.html');
    return res.sendFile(path.join(__dirname, 'auth.html'));
  }

  try {
    verifyToken(token);
    console.log('🟢 Валидный токен, показываю index.html');
    res.sendFile(path.join(__dirname, 'index.html'));
  } catch (err) {
    console.log('🔴 Невалидный токен, показываю auth.html');
    res.sendFile(path.join(__dirname, 'auth.html'));
  }
});

// ---- fallback ----
app.use((req, res) => {
  if (
    req.originalUrl.startsWith('/posts') ||
    req.originalUrl.startsWith('/comments') ||
    req.originalUrl.startsWith('/users') ||
    req.originalUrl.startsWith('/auth')
  ) {
    return res.status(404).json({ error: 'API route not found' });
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---- error handler ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err?.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ---- запуск ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
