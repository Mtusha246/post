// === posts.js ===
const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware'); // ✅ JWT middleware

// === Получить все посты с комментариями === (открытый роут)
router.get('/', async (req, res) => {
  try {
    const postsRes = await db.query(`
      SELECT p.*, u.username
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    const commentsRes = await db.query(`
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.id ASC
    `);

    const posts = postsRes.rows.map(p => ({
      ...p,
      comments: commentsRes.rows.filter(c => c.post_id === p.id)
    }));

    res.json(posts);
  } catch (err) {
    console.error('❌ Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// === Создать новый пост === (только авторизованный, 1 раз в час)
router.post('/', authMiddleware, async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Проверяем, создавал ли пользователь пост за последний час
    const lastPost = await db.query(
      `SELECT created_at 
       FROM posts 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (lastPost.rows.length > 0) {
      const lastTime = new Date(lastPost.rows[0].created_at);
      const diffHours = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) {
        const remaining = Math.ceil((1 - diffHours) * 60);
        return res.status(429).json({
          error: `You can create only one post per hour. Try again in ${remaining} minutes.`,
        });
      }
    }

    const result = await db.query(
      `INSERT INTO posts (user_id, content, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [userId, content]
    );

    const userRes = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    const post = { ...result.rows[0], username: userRes.rows[0].username };

    console.log(`📝 New post created by ${post.username}`);
    res.status(201).json(post);
  } catch (err) {
    console.error('❌ Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// === Изменить пост === (только автор)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const postRes = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
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
      [content, id]
    );

    console.log(`✏️ Post ${id} updated by user ID ${req.user.id}`);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('❌ Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// === Удалить пост === (только автор)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const postRes = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (postRes.rows.length === 0)
      return res.status(404).json({ error: 'Post not found' });

    if (postRes.rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'You can delete only your own posts' });

    await db.query('DELETE FROM comments WHERE post_id = $1', [id]);
    await db.query('DELETE FROM posts WHERE id = $1', [id]);

    console.log(`🗑️ Post ${id} deleted by user ID ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// === Добавить комментарий === (только авторизованный)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO comments (post_id, user_id, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [id, userId, content]
    );

    const userRes = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    const comment = { ...result.rows[0], username: userRes.rows[0].username };

    console.log(`💬 Comment added by ${comment.username}`);
    res.status(201).json(comment);
  } catch (err) {
    console.error('❌ Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
