const express = require('express');
const cors = require('cors');
const path = require('path');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');
const authRouter = require('./auth');

const app = express();
const PORT = process.env.PORT || 8080;

// ---- simple request logger for debugging ----
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'] }));

// ---- Serve static files (CSS, JS, images) ----
app.use(express.static(__dirname)); // 👈 всё ищет в корне проекта

// optional: silence browser favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- API ---
app.use('/auth', authRouter);
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// --- Default route: если нет токена — показываем login.html ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html')); // 👈 лежит прямо в корне
});

// --- Fallback для SPA ---
app.use((req, res, next) => {
  if (
    req.originalUrl.startsWith('/posts') ||
    req.originalUrl.startsWith('/comments') ||
    req.originalUrl.startsWith('/users') ||
    req.originalUrl.startsWith('/api') ||
    req.originalUrl.startsWith('/auth')
  ) {
    return res.status(404).json({ error: 'API route not found' });
  }

  // 👇 если не API, возвращаем основную страницу
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---- central error handler ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
