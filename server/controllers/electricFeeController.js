const db = require('../database/db');

/**
 * Get electric fee records for a stall
 * GET /api/electric-fees?stall_id=&year=
 */
const getAll = async (req, res) => {
  const { stall_id, year } = req.query;
  try {
    let sql = `
      SELECT ef.*, s.stall_number, b.name AS building_name, o.full_name AS owner_name
      FROM electric_fees ef
      JOIN stalls s ON s.id = ef.stall_id
      LEFT JOIN buildings b ON b.id = s.building_id
      LEFT JOIN stall_owners o ON o.stall_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (stall_id) { sql += ' AND ef.stall_id = ?'; params.push(stall_id); }
    if (year)     { sql += ' AND ef.year = ?';     params.push(year); }
    sql += ' ORDER BY ef.year DESC, ef.month ASC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create or update an electric fee record
 * POST /api/electric-fees
 */
const upsert = async (req, res) => {
  const { stall_id, year, month, reading_prev, reading_curr, rate_per_kwh, amount_due, is_paid } = req.body;
  if (!stall_id || !year || !month) {
    return res.status(400).json({ message: 'stall_id, year, and month are required.' });
  }
  try {
    await db.execute(`
      INSERT INTO electric_fees (stall_id, year, month, reading_prev, reading_curr, rate_per_kwh, amount_due, is_paid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        reading_prev  = VALUES(reading_prev),
        reading_curr  = VALUES(reading_curr),
        rate_per_kwh  = VALUES(rate_per_kwh),
        amount_due    = VALUES(amount_due),
        is_paid       = VALUES(is_paid)
    `, [stall_id, year, month, reading_prev || 0, reading_curr || 0, rate_per_kwh || 0, amount_due || 0, is_paid ? 1 : 0]);
    res.json({ message: 'Electric fee record saved.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Mark electric fee as paid
 * PATCH /api/electric-fees/:id/pay
 */
const markPaid = async (req, res) => {
  try {
    await db.execute('UPDATE electric_fees SET is_paid = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Marked as paid.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete an electric fee record
 * DELETE /api/electric-fees/:id
 */
const remove = async (req, res) => {
  try {
    await db.execute('DELETE FROM electric_fees WHERE id = ?', [req.params.id]);
    res.json({ message: 'Electric fee record deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, upsert, markPaid, remove };
