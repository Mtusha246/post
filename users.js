// users.js
const express = require('express');
const router = express.Router();

let users = [];

router.get('/', (req, res) => res.json(users));

router.post('/', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  const newUser = { id: Date.now(), username };
  users.push(newUser);
  res.status(201).json(newUser);
});

module.exports = router;

