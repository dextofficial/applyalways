const jwt = require('jsonwebtoken');
const { User } = require('./models');

async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose) return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    if (user.suspended) return res.status(403).json({ error: 'Your account is suspended. Contact support.' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { auth, adminOnly, sign };
