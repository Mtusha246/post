const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // ✅ Пытаемся взять токен из cookie или из заголовка Authorization
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;

  const token = cookieToken || (authHeader && authHeader.split(' ')[1]);

  console.log('🔐 Authorization header:', authHeader);
  console.log('🍪 Cookie token:', cookieToken);

  if (!token) {
    console.log('🚫 Нет токена!');
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret123');
    console.log('✅ Token decoded:', decoded);
    req.user = decoded; // 👈 кладём данные пользователя в запрос
    next();
  } catch (err) {
    console.error('❌ JWT verify error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
