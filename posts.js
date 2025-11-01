const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./middleware/authMiddleware'); // 👈 импортируем JWT мидлвэр

// === Получить все посты с комментариями === (открытый роут)
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

// === Создать пост === (только авторизованный пользователь)
router.post('/', authMiddleware, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const result = await db.query(
      'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *',
      [req.user.id, content] // 👈 теперь посты принадлежат пользователю из токена
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// === Удалить пост === (только автор)
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    // проверяем, что пост принадлежит пользователю
    const postRes = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (postRes.rows.length === 0)
      return res.status(404).json({ error: 'Post not found' });
    if (postRes.rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'You can delete only your own posts' });

    await db.query('DELETE FROM comments WHERE post_id = $1', [id]);
    await db.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// === Добавить комментарий к посту === (только авторизованные)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  const { content, commentContent } = req.body;

  const text = content || commentContent;
  if (!text) return res.status(400).json({ error: 'Comment content is required' });

  try {
    const result = await db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, req.user.id, text] // 👈 user_id из токена
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
