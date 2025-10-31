const express = require('express');
const cors = require('cors');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

/**
 * DEPLOYMENT NOTE:
 * During deployment, you can later set CLIENT_URL (e.g. https://myfrontend.site)
 * in the platform environment variables.
 * For now, allow all origins to prevent 502 errors.
 */
const corsOptions = {
  origin: '*', // ← временно открыто для всех (иначе 502 при отсутствии CLIENT_URL)
  methods: ['GET', 'POST', 'DELETE']
};
app.use(cors(corsOptions));

// Helper functions for reading and writing "data.json"
async function readData() {
  return new Promise((resolve) => {
    fs.readFile('data.json', 'utf8', (err, data) => {
      if (err || !data) {
        resolve([
          { id: 1, content: "Hello! This is my first post.", comments: [] }
        ]);
      } else {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve([
            { id: 1, content: "Hello! This is my first post.", comments: [] }
          ]);
        }
      }
    });
  });
}

async function writeData(data) {
  return new Promise((resolve, reject) => {
    fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// GET /posts - Get all posts
app.get('/posts', async (req, res) => {
  const posts = await readData();
  res.status(200).json(posts);
});

// POST /posts - Create new post
app.post('/posts', async (req, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required.' });
  }
  const posts = await readData();
  const maxId = posts.reduce((max, post) => post.id > max ? post.id : max, 0);
  const newPost = {
    id: maxId + 1,
    content,
    comments: []
  };
  posts.push(newPost);
  await writeData(posts);
  res.status(201).json(newPost);
});

// DELETE /posts/:id - Delete post by ID
app.delete('/posts/:id', async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  let posts = await readData();
  const postIndex = posts.findIndex(post => post.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  posts.splice(postIndex, 1);
  await writeData(posts);
  res.status(200).json({ message: 'Post deleted successfully.' });
});

// POST /posts/:postId/comments - Add comment to a post
app.post('/posts/:postId/comments', async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const { commentContent } = req.body;
  if (!commentContent || typeof commentContent !== 'string') {
    return res.status(400).json({ error: 'Comment content is required.' });
  }
  const posts = await readData();
  const post = posts.find(post => post.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  const maxCommentId = post.comments.reduce((max, c) => c.id > max ? c.id : max, 0);
  const newComment = {
    id: maxCommentId + 1,
    content: commentContent
  };
  post.comments.push(newComment);
  await writeData(posts);
  res.status(200).json(post);
});

// GET / - Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', api: 'social-api is running' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
});
