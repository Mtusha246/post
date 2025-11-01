const express = require('express');
const router = express.Router();
const db = require('./db'); // должен экспортировать pool с методом query

console.log('✅ posts.js connected');

// --- GET /posts  - вернуть все посты
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM posts ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// --- POST /posts  - создать пост
router.post('/', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content required' });
    }

    const result = await db.query(
      'INSERT INTO posts (content) VALUES ($1) RETURNING *',
      [content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// --- POST /posts/:id/comments  - добавить комментарий к посту
router.post('/:id/comments', async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { user_id, content } = req.body;

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, user_id || null, content.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
