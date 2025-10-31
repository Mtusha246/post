// posts.js
const express = require('express');
const router = express.Router();

let posts = []; // временное хранилище в памяти
let postId = 1;
let commentId = 1;

// === Получить все посты ===
router.get('/', (req, res) => {
  res.json(posts);
});

// === Создать новый пост ===
router.post('/', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content required' });
  }
  const newPost = { id: postId++, content: content.trim(), comments: [] };
  posts.push(newPost);
  res.status(201).json(newPost);
});

// === Удалить пост ===
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  posts = posts.filter(p => p.id !== id);
  res.json({ message: 'Post deleted' });
});

// === Добавить комментарий к посту ===
router.post('/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  const { commentContent } = req.body;

  const post = posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (!commentContent || !commentContent.trim()) {
    return res.status(400).json({ error: 'Comment required' });
  }

  const newComment = { id: commentId++, content: commentContent.trim() };
  post.comments.push(newComment);

  res.status(201).json(newComment);
});

module.exports = router;
