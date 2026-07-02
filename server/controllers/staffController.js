const db = require('../database/db');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, employee_id, full_name, role, department, is_active, created_at FROM staff_users ORDER BY role, full_name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  const { employee_id, full_name, role, department } = req.body;
  if (!employee_id || !full_name || !role) {
    return res.status(400).json({ message: 'Employee ID, full name, and role are required.' });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO staff_users (employee_id, full_name, role, department, is_active) VALUES (?,?,?,?,1)',
      [employee_id.trim(), full_name.trim(), role, department || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Staff account created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Employee ID "${req.body.employee_id}" already exists.` });
    }
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  const { full_name, role, department } = req.body;
  if (!full_name || !role) {
    return res.status(400).json({ message: 'Full name and role are required.' });
  }
  try {
    const [result] = await db.execute(
      'UPDATE staff_users SET full_name=?, role=?, department=? WHERE id=?',
      [full_name.trim(), role, department || null, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }
    res.json({ message: 'Staff account updated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    // Prevent admin from deleting their own account
    if (String(req.params.id) === String(req.user?.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const [rows] = await db.execute(
      'SELECT id, employee_id, full_name, role FROM staff_users WHERE id=?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    // Hard delete — permanently removes the account
    await db.execute('DELETE FROM staff_users WHERE id=?', [req.params.id]);

    res.json({ message: `Staff account "${rows[0].full_name}" has been permanently deleted.` });
  } catch (err) {
    console.error('Delete staff error:', err.code, err.message);
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      // Has activity logs — soft delete instead
      await db.execute('UPDATE staff_users SET is_active=0 WHERE id=?', [req.params.id]);
      return res.json({ message: 'Staff account deactivated (has activity history).' });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, create, update, remove };