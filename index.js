const express = require('express');
const cors = require('cors');
const path = require('path');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));

// --- API ---
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// --- Главная страница ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Обработка несуществующих API ---
app.use((req, res, next) => {
  if (
    req.originalUrl.startsWith('/posts') ||
    req.originalUrl.startsWith('/comments') ||
    req.originalUrl.startsWith('/users')
  ) {
    return res.status(404).json({ error: 'Not Found' });
  }
  next();
});

// --- Отдаём статику (в самом конце!) ---
app.use(express.static(__dirname));

// --- Запуск ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
