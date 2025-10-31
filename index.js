// index.js
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

// --- Подключаем фронтенд (index.html, стили и т.п.) ---
app.use(express.static(__dirname));

// --- Подключаем API ---
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// --- Главная страница ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- fallback (если пользователь зашёл, например, /profile или /feed) ---
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Запуск сервера ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
