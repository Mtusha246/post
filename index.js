const express = require('express');
const cors = require('cors');
const path = require('path');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));

// --- API ---
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/users', usersRouter);

// --- Статика (фронт) ---
app.use(express.static(__dirname));

// --- Главная страница ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Fallback для SPA ---
app.use((req, res, next) => {
  if (
    req.originalUrl.startsWith('/api/') || 
    req.originalUrl.startsWith('/posts') ||
    req.originalUrl.startsWith('/comments') ||
    req.originalUrl.startsWith('/users')
  ) {
    return next(); // не трогаем API
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Запуск ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
