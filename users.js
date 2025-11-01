const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// === Регистрация ===
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    // Проверим, нет ли уже пользователя с таким email
    const userCheck = await db.query('SELECT id FROM users WHERE username = $1', [email]);
    if (userCheck.rows.length > 0)
      return res.status(400).json({ error: 'User already exists' });

    // Хешируем пароль
    const hashed = await bcrypt.hash(password, 10);

    // Сохраняем в БД
    const result = await db.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
      [email, hashed]
    );

    const user = result.rows[0];
    res.status(201).json({ message: 'User registered', user });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// === Логин ===
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const userRes = await db.query('SELECT * FROM users WHERE username = $1', [email]);
    const user = userRes.rows[0];

    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password' });

    // создаём JWT токен
    const token = jwt.sign({ id: user.id, email: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// === Получить всех пользователей (только для теста/отладки) ===
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, created_at FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
