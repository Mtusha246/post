// posts.js
const express = require('express');
const router = express.Router();

let posts = []; // временно в памяти

router.get('/', (req, res) => res.json(posts));

router.post('/', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  const newPost = { id: Date.now(), content, comments: [] };
  posts.push(newPost);
  res.status(201).json(newPost);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  posts.splice(index, 1);
  res.json({ message: 'Deleted' });
});

module.exports = router;

