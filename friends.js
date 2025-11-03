const express = require('express');
const router = express.Router();
const db = require('./db');
const authMiddleware = require('./authMiddleware');

// Send a friend request by username
router.post('/request', authMiddleware, async (req, res) => {
  const fromUserId = req.user.id;
  const { toUsername } = req.body;

  if (!toUsername || typeof toUsername !== 'string') {
    return res.status(400).json({ error: 'toUsername is required' });
  }

  try {
    const toRes = await db.query('SELECT id FROM users WHERE username = $1', [toUsername]);
    if (toRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const toUserId = toRes.rows[0].id;
    if (toUserId === fromUserId) return res.status(400).json({ error: 'Cannot add yourself' });

    // If already friends
    const friendsRes = await db.query(
      `SELECT 1 FROM friendships WHERE (user_id=$1 AND friend_user_id=$2) OR (user_id=$2 AND friend_user_id=$1)`,
      [fromUserId, toUserId]
    );
    if (friendsRes.rows.length > 0) return res.status(409).json({ error: 'Already friends' });

    // If request exists (either direction) and pending
    const reqRes = await db.query(
      `SELECT * FROM friend_requests 
       WHERE ((from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1))
       AND status='pending'`,
      [fromUserId, toUserId]
    );
    if (reqRes.rows.length > 0) return res.status(409).json({ error: 'Request already pending' });

    const created = await db.query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status, created_at)
       VALUES ($1, $2, 'pending', NOW()) RETURNING *`,
      [fromUserId, toUserId]
    );

    res.status(201).json({ success: true, request: created.rows[0] });
  } catch (e) {
    console.error('❌ Friend request error:', e);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// List incoming friend requests for current user
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT fr.id, fr.from_user_id, u.username AS from_username, fr.created_at
       FROM friend_requests fr
       JOIN users u ON u.id = fr.from_user_id
       WHERE fr.to_user_id = $1 AND fr.status='pending'
       ORDER BY fr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.rows);
  } catch (e) {
    console.error('❌ Fetch requests error:', e);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Accept a friend request by requestId
router.post('/accept', authMiddleware, async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId is required' });

  try {
    const reqRes = await db.query('SELECT * FROM friend_requests WHERE id=$1 AND status=\'pending\'', [requestId]);
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    const fr = reqRes.rows[0];
    if (fr.to_user_id !== req.user.id) return res.status(403).json({ error: 'Not your request to accept' });

    // Mark accepted
    await db.query('UPDATE friend_requests SET status=\'accepted\' WHERE id=$1', [requestId]);

    // Create friendship (both directions)
    await db.query(
      `INSERT INTO friendships (user_id, friend_user_id, created_at)
       VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
      [fr.from_user_id, fr.to_user_id]
    );
    await db.query(
      `INSERT INTO friendships (user_id, friend_user_id, created_at)
       VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
      [fr.to_user_id, fr.from_user_id]
    );

    res.json({ success: true });
  } catch (e) {
    console.error('❌ Accept request error:', e);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// List friends
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT u.id, u.username, u.email
       FROM friendships f
       JOIN users u ON u.id = f.friend_user_id
       WHERE f.user_id = $1
       ORDER BY u.username ASC`,
      [req.user.id]
    );
    res.json(rows.rows);
  } catch (e) {
    console.error('❌ Fetch friends error:', e);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

module.exports = router;


