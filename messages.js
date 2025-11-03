const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware');

// List conversation threads (friends with last message time)
router.get('/threads', authMiddleware, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT u.id, u.username, u.email,
              MAX(m.created_at) AS last_at
       FROM friendships f
       JOIN users u ON u.id = f.friend_user_id
       LEFT JOIN messages m ON (m.sender_id = f.user_id AND m.receiver_id = f.friend_user_id)
                          OR (m.sender_id = f.friend_user_id AND m.receiver_id = f.user_id)
       WHERE f.user_id = $1
       GROUP BY u.id
       ORDER BY last_at DESC NULLS LAST, u.username ASC`,
      [req.user.id]
    );
    res.json(rows.rows);
  } catch (e) {
    console.error('❌ Fetch threads error:', e);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// List messages with a friend
router.get('/:friendId', authMiddleware, async (req, res) => {
  const friendId = parseInt(req.params.friendId, 10);
  if (!friendId) return res.status(400).json({ error: 'friendId required' });
  try {
    // Ensure they are friends
    const fr = await db.query(
      `SELECT 1 FROM friendships WHERE user_id=$1 AND friend_user_id=$2`,
      [req.user.id, friendId]
    );
    if (fr.rows.length === 0) return res.status(403).json({ error: 'Not friends' });

    const rows = await db.query(
      `SELECT id, sender_id, receiver_id, content, created_at
       FROM messages
       WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
       ORDER BY created_at ASC
       LIMIT 200`,
      [req.user.id, friendId]
    );
    res.json(rows.rows);
  } catch (e) {
    console.error('❌ Fetch messages error:', e);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', authMiddleware, async (req, res) => {
  const { toUserId, content } = req.body;
  if (!toUserId || !content || content.trim() === '')
    return res.status(400).json({ error: 'toUserId and content required' });
  try {
    // Ensure they are friends
    const fr = await db.query(
      `SELECT 1 FROM friendships WHERE user_id=$1 AND friend_user_id=$2`,
      [req.user.id, toUserId]
    );
    if (fr.rows.length === 0) return res.status(403).json({ error: 'Not friends' });

    const inserted = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id, sender_id, receiver_id, content, created_at`,
      [req.user.id, toUserId, content]
    );
    res.status(201).json(inserted.rows[0]);
  } catch (e) {
    console.error('❌ Send message error:', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;


