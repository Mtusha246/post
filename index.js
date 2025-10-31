// index.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const app = express();
const DATA_FILE = './data.json';

// --- ensure file exists ---
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// --- middleware ---
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));

// --- helper functions ---
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading file:', err);
    return [];
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing file:', err);
  }
}

// --- routes ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API is running 🚀' });
});

app.get('/posts', (req, res) => {
  res.json(readData());
});

app.post('/posts', (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required' });
  }
  const posts = readData();
  const newPost = { id: Date.now(), content, comments: [] };
  posts.push(newPost);
  writeData(posts);
  res.status(201).json(newPost);
});

app.delete('/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id, 10);
  let posts = readData();
  const index = posts.findIndex(p => p.id === postId);
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  posts.splice(index, 1);
  writeData(posts);
  res.json({ message: 'Post deleted' });
});

app.post('/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { commentContent } = req.body;
  if (!commentContent || typeof commentContent !== 'string') {
    return res.status(400).json({ error: 'Comment content required' });
  }
  const posts = readData();
  const post = posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const newComment = { id: Date.now(), content: commentContent };
  post.comments.push(newComment);
  writeData(posts);
  res.json(post);
});

// --- start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
});
