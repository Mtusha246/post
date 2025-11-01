const express = require('express');
const router = express.Router();
const db = require('./db'); // если ты работаешь через pg или sequelize

// ...твои существующие маршруты для постов

// Добавляем комментарий к посту
router.post('/:id/comments', async (req, res) => {
  const postId = req.params.id;
  const { user_id, content } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, user_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
