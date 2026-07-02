const db = require('../database/db');

const authMiddleware = async (req, res, next) => {
  // Method 1: Session-based (works locally)
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }

  // Method 2: Token-based via Authorization header (works cross-domain)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts   = decoded.split(':');
      const userId  = parts[0];

      if (userId) {
        const [rows] = await db.execute(
          'SELECT id, employee_id, full_name, role, department FROM staff_users WHERE id = ? AND is_active = 1',
          [userId]
        );
        if (rows.length > 0) {
          req.user = rows[0];
          return next();
        }
      }
    } catch (err) {
      console.warn('Token auth failed:', err.message);
    }
  }

  return res.status(401).json({ message: 'Unauthorized. Please log in.' });
};

module.exports = authMiddleware;