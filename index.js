const express = require('express');
const cors = require('cors');
const path = require('path');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));

// --- API ---
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// --- Отдаём статику ---
app.use(express.static(__dirname));

// --- Главная страница ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Fallback только для фронта (не для API) ---
app.use((req, res, next) => {
  if (
    req.originalUrl.startsWith('/posts') ||
    req.originalUrl.startsWith('/comments') ||
    req.originalUrl.startsWith('/users')
  ) {
    // Не обрабатываем API — пусть Express ищет маршрут
    return res.status(404).json({ error: 'Not Found' });
  }

  // А вот остальное — фронту
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Запуск ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
