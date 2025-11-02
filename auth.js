const express = require('express');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

const connectionString = 'postgresql://postgres:gjbLXHghHdItlgjBWudmyhfESlrbsPke@caboose.proxy.rlwy.net:19817/railway';
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

client.connect();

// === Настройка почты ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',        // ⚠️ замени на свой Gmail
    pass: 'your_app_password',           // ⚠️ не пароль от Gmail, а App Password!
  },
});

// === Регистрация ===
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const result = await client.query(
      'INSERT INTO users (username, email, password, verification_token) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashedPassword, verificationToken]
    );

    // Отправляем email с верификационной ссылкой
    const verifyLink = `http://localhost:3000/verify/${verificationToken}`;
    await transporter.sendMail({
      from: 'your_email@gmail.com',
      to: email,
      subject: 'Verify your account',
      text: `Click the link to verify your account: ${verifyLink}`,
    });

    res.json({ message: 'User registered. Please check your email to verify your account.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// === Подтверждение email ===
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await client.query(
      'UPDATE users SET verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING *',
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// === Логин ===
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (!user.verified) {
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Wrong password' });
    }

    res.json({ message: 'Login successful', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
