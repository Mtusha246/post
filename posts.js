const express = require('express');
const router = express.Router();
const db = require('./db');
 // импорт твоего модуля для работы с базой

// === Получить все посты с комментариями ===
router.get('/', async (req, res) => {
  try {
    const postsRes = await db.query('SELECT * FROM posts ORDER BY id DESC');
    const posts = postsRes.rows;

    // Получаем комментарии для всех постов
    const commentsRes = await db.query('SELECT * FROM comments ORDER BY id ASC');
    const comments = commentsRes.rows;

    // Добавляем комментарии в каждый пост
    const postsWithComments = posts.map(p => ({
      ...p,
      comments: comments.filter(c => c.post_id === p.id)
    }));

    res.json(postsWithComments);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// === Создать пост ===
router.post('/', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const result = await db.query(
      'INSERT INTO posts (content) VALUES ($1) RETURNING *',
      [content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// === Удалить пост ===
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM comments WHERE post_id = $1', [id]);
    await db.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// === Добавить комментарий к посту ===
router.post('/:id/comments', async (req, res) => {
  const postId = req.params.id;
  const { user_id, content, commentContent } = req.body;

  // поддерживаем оба варианта — content или commentContent
  const text = content || commentContent;
  if (!text) return res.status(400).json({ error: 'Comment content is required' });

  try {
    const result = await db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, user_id || 1, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
