// index.js
const express = require('express');
const cors = require('cors');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));

// --- подключаем роуты ---
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// --- базовый маршрут ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API is running 🚀' });
});

// --- старт ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
