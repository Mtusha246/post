const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware'); // 👈 JWT мидлвэр

// === Добавить комментарий к посту ===
router.post('/:postId', authMiddleware, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const { commentContent, content } = req.body;

  // поддерживаем оба поля — commentContent или content
  const text = commentContent || content;
  if (!text) return res.status(400).json({ error: 'No comment text provided' });

  try {
    // Проверим, существует ли пост
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0)
      return res.status(404).json({ error: 'Post not found' });

    // Добавим комментарий в таблицу
    const result = await db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, req.user.id, text]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// === Получить все комментарии к посту ===
router.get('/:postId', async (req, res) => {
  const postId = parseInt(req.params.postId, 10);

  try {
    const result = await db.query(
      'SELECT c.*, u.username FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.id ASC',
      [postId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// === Удалить комментарий ===
router.delete('/:commentId', authMiddleware, async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);

  try {
    const commentRes = await db.query('SELECT * FROM comments WHERE id = $1', [commentId]);
    if (commentRes.rows.length === 0)
      return res.status(404).json({ error: 'Comment not found' });

    const comment = commentRes.rows[0];
    if (comment.user_id !== req.user.id)
      return res.status(403).json({ error: 'You can delete only your own comments' });

    await db.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
