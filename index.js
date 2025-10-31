// index.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const postsRouter = require('./posts');
const commentsRouter = require('./comments');
const usersRouter = require('./users');

const PORT = process.env.PORT || 3000;
const app = express();

// --- middlewares ---
app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));

// --- serve frontend (index.html) ---
app.use(express.static(__dirname)); // отдаёт index.html и все файлы рядом

// --- API routes ---
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/users', usersRouter);

// --- fallback для / -> index.html ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
