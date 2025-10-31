const express = require('express');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

// --- In-memory "database" ---
let postsData = [];

// --- Middleware ---
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));

// --- Serve your index.html file ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API routes ---
app.get('/posts', (req, res) => {
  res.json(postsData);
});

app.post('/posts', (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required' });
  }
  const newPost = { id: Date.now(), content, comments: [] };
  postsData.push(newPost);
  res.status(201).json(newPost);
});

app.delete('/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const index = postsData.findIndex(p => p.id === postId);
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  postsData.splice(index, 1);
  res.json({ message: 'Post deleted' });
});

app.post('/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { commentContent } = req.body;
  if (!commentContent || typeof commentContent !== 'string') {
    return res.status(400).json({ error: 'Comment content required' });
  }
  const post = postsData.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const newComment = { id: Date.now(), content: commentContent };
  post.comments.push(newComment);
  res.json(post);
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
});
