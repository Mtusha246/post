const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware'); // ✅ JWT мидлвэр

// === Получить все посты с комментариями === (открытый роут)
router.get('/', async (req, res) => {
  try {
    const postsRes = await db.query(
      `SELECT p.*, u.username 
       FROM posts p 
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`
    );
    const posts = postsRes.rows;

    // Получаем комментарии для всех постов
    const commentsRes = await db.query(
      `SELECT c.*, u.username 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.id ASC`
    );
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

// === Создать пост === (только авторизованный пользователь, 1 раз в час)
router.post('/', authMiddleware, async (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === '')
    return res.status(400).json({ error: 'Content is required' });

  try {
    // Проверяем, был ли пост за последний час
    const recentPost = await db.query(
      `SELECT * FROM posts 
       WHERE user_id = $1 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [req.user.id]
    );

    if (recentPost.rows.length > 0) {
      return res
        .status(429)
        .json({ error: 'You can create only one post per hour' });
    }

    const result = await db.query(
      `INSERT INTO posts (user_id, content, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [req.user.id, content]
    );

    // Добавляем username для фронта
    const userRes = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const post = { ...result.rows[0], username: userRes.rows[0].username };

    console.log(`📝 New post by ${post.username}`);
    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// === Изменить свой пост === (только автор)
router.put('/:id', authMiddleware, async (req, res) => {
  const { content } = req.body;
  const postId = req.params.id;

  if (!content || content.trim() === '')
    return res.status(400).json({ error: 'Content is required' });

  try {
    const postRes = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
    if (postRes.rows.length === 0)
      return res.status(404).json({ error: 'Post not found' });

    const post = postRes.rows[0];
    if (post.user_id !== req.user.id)
      return res.status(403).json({ error: 'You can edit only your own posts' });

    const updated = await db.query(
      `UPDATE posts 
       SET content = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [content, postId]
    );

    console.log(`✏️ Post ${postId} updated by user ${req.user.username}`);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// === Удалить пост === (только автор)
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
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

// === Добавить комментарий === (только авторизованный)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;

  if (!content || content.trim() === '')
    return res.status(400).json({ error: 'Comment content is required' });

  try {
    const result = await db.query(
      `INSERT INTO comments (post_id, user_id, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [postId, req.user.id, content]
    );

    const userRes = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const comment = { ...result.rows[0], username: userRes.rows[0].username };

    console.log(`💬 New comment by ${comment.username}`);
    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
