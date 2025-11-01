const express = require('express');
const cors = require('cors');
const path = require('path');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');
const authRouter = require('./auth'); // 👈 добавили авторизацию

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

// ---- Serve static files first (css/js/images etc) ----
app.use(express.static(__dirname));

// optional: silence browser favicon requests (prevents 404 noise)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- API (keep API routes after static so assets still served) ---
app.use('/auth', authRouter); // 👈 маршруты регистрации и логина
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// --- Fallback for SPA routes (only when not an API route) ---
app.use((req, res, next) => {
  // if request looks like api -> let it be handled above (or return 404)
  if (
    req.originalUrl.startsWith('/posts') ||
    req.originalUrl.startsWith('/comments') ||
    req.originalUrl.startsWith('/users') ||
    req.originalUrl.startsWith('/api') ||
    req.originalUrl.startsWith('/auth') // 👈 добавлено
  ) {
    return res.status(404).json({ error: 'API route not found' });
  }

  // otherwise return index.html for frontend SPA routing
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---- central error handler (so async errors return 500 and log) ----
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
