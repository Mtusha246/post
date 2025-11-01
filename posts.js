const express = require('express');
const router = express.Router();
const pool = require('./db');

// === Получить все посты ===
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM posts ORDER BY id DESC');
  res.json(result.rows);
});

// === Создать новый пост ===
router.post('/', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content required' });
  }

  const result = await pool.query(
    'INSERT INTO posts (content) VALUES ($1) RETURNING *',
    [content.trim()]
  );

  res.status(201).json(result.rows[0]);
});

module.exports = router;
