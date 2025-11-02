// === логин ===
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await client.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0)
      return res.status(400).json({ error: 'User not found' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: 'Invalid password' });

    if (!user.verified)
      return res.status(403).json({ error: 'Email not verified' });

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 👇 Добавляем установку cookie
    res.cookie('token', token, {
      httpOnly: true,   // защищает от JS-доступа
      secure: false,    // true если HTTPS
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000, // 2 часа
    });

    // Можешь вернуть сообщение, но не сам токен
    res.json({ success: true, message: 'Login successful' });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
