// index.js — улучшенный для Railway (один инстанс)
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 8080;
const CLIENT_URL = process.env.CLIENT_URL || null; // set in env for prod

// --- utils: promises
const fsp = fs.promises;

// --- ensure data file exists
async function ensureDataFile() {
  try {
    await fsp.access(DATA_FILE);
  } catch {
    await fsp.writeFile(DATA_FILE, JSON.stringify([
      { id: Date.now(), content: "Hello! This is my first post.", comments: [] }
    ], null, 2), 'utf8');
  }
}

// --- simple in-process mutex to serialize writes (works per process)
let writeInProgress = false;
const writeQueue = [];
async function enqueueWrite(fn) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ fn, resolve, reject });
    runQueue();
  });
}
async function runQueue() {
  if (writeInProgress) return;
  const job = writeQueue.shift();
  if (!job) return;
  writeInProgress = true;
  try {
    const res = await job.fn();
    job.resolve(res);
  } catch (err) {
    job.reject(err);
  } finally {
    writeInProgress = false;
    // next tick to allow queue processing
    setImmediate(runQueue);
  }
}

// --- read/write helpers (atomic-ish: write temp -> rename)
async function readData() {
  try {
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    // log parse/read errors but don't crash the server
    console.error('readData error:', err);
    return [];
  }
}
async function writeDataAtomic(data) {
  // serialize writes to avoid races in-process
  return enqueueWrite(async () => {
    const tmp = `${DATA_FILE}.tmp`;
    const text = JSON.stringify(data, null, 2);
    await fsp.writeFile(tmp, text, 'utf8');
    await fsp.rename(tmp, DATA_FILE);
  });
}

// --- init
(async () => {
  await ensureDataFile();
})().catch(err => {
  console.error('Failed to ensure data file', err);
  process.exit(1);
});

// --- express app
const app = express();

// limit body size to avoid large payloads
app.use(express.json({ limit: '100kb' }));

// CORS: allow only frontend origin in prod
app.use(cors({
  origin: CLIENT_URL || '*',
  methods: ['GET', 'POST', 'DELETE']
}));

// small helper to validate strings
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

// health
app.get('/', (req, res) => {
  res.json({ status: 'ok', api: 'social-api is running' });
});

// list posts
app.get('/posts', async (req, res, next) => {
  try {
    const posts = await readData();
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// create post
app.post('/posts', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!isNonEmptyString(content)) return res.status(400).json({ error: 'Content is required' });

    const posts = await readData();
    const newPost = { id: Date.now(), content: content.trim(), comments: [] };
    posts.push(newPost);
    await writeDataAtomic(posts);
    res.status(201).json(newPost);
  } catch (err) {
    next(err);
  }
});

// delete post
app.delete('/posts/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const posts = await readData();
    const idx = posts.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Post not found' });

    posts.splice(idx, 1);
    await writeDataAtomic(posts);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
});

// add comment
app.post('/posts/:postId/comments', async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const { commentContent } = req.body;
    if (Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post id' });
    if (!isNonEmptyString(commentContent)) return res.status(400).json({ error: 'Comment content required' });

    const posts = await readData();
    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const newComment = { id: Date.now(), content: commentContent.trim() };
    post.comments.push(newComment);
    await writeDataAtomic(posts);
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// graceful shutdown
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
});
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
