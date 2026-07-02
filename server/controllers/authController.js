const db = require('../database/db');

const login = async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) {
    return res.status(400).json({ message: 'Employee ID is required.' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM staff_users WHERE employee_id = ? AND is_active = 1',
      [employee_id.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid Employee ID. Access denied.' });
    }

    const user = rows[0];
    const userData = {
      id:          user.id,
      employee_id: user.employee_id,
      full_name:   user.full_name,
      role:        user.role,
      department:  user.department,
    };

    // Store in session
    req.session.user = userData;

    // Log activity (non-blocking)
    db.execute(
      'INSERT INTO activity_logs (user_id, action, table_name) VALUES (?, ?, ?)',
      [user.id, 'LOGIN', 'staff_users']
    ).catch(err => console.warn('Activity log failed:', err.message));

    // Return user data in response body
    // Frontend stores this in localStorage (no cookie dependency)
    return res.json({
      message: 'Login successful',
      user:    userData,
      token:   Buffer.from(`${user.id}:${user.employee_id}:${Date.now()}`).toString('base64'),
    });

  } catch (err) {
    console.error('=== LOGIN ERROR ===', err.code, err.message);
    if (err.code === 'ECONNREFUSED')           return res.status(500).json({ message: 'Database connection refused. Is MySQL running?' });
    if (err.code === 'ER_ACCESS_DENIED_ERROR') return res.status(500).json({ message: 'Database access denied. Check credentials.' });
    if (err.code === 'ER_BAD_DB_ERROR')        return res.status(500).json({ message: 'Database not found. Run schema.sql first.' });
    if (err.code === 'ER_NO_SUCH_TABLE')       return res.status(500).json({ message: 'Tables not found. Run schema.sql first.' });
    return res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

const logout = async (req, res) => {
  req.session.destroy(() => {});
  res.clearCookie('connect.sid');
  return res.json({ message: 'Logged out successfully.' });
};

const me = (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  return res.json({ user: req.session.user });
};

module.exports = { login, logout, me };