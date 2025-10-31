// comments.js
const express = require('express');
const router = express.Router();

// Импортируем посты из posts.js (если будет общая память — можно будет объединить)
let posts = [];

router.post('/:postId', (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const { commentContent } = req.body;
  if (!commentContent) return res.status(400).json({ error: 'No comment' });

  const post = posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const newComment = { id: Date.now(), content: commentContent };
  post.comments.push(newComment);
  res.status(201).json(newComment);
});

module.exports = router;

