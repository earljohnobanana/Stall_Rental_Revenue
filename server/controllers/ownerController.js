const db = require('../database/db');

const getAll = async (req, res) => {
  try {
    const { building_id } = req.query;

    // Use LEFT JOINs so ALL owners show — including past owners with no current stall
    let sql = `
      SELECT 
        o.*,
        s.stall_number,
        s.id          AS stall_table_id,
        s.rental_rate,
        s.security_deposit,
        s.electric_fee,
        b.name        AS building_name,
        CASE WHEN o.stall_id IS NOT NULL THEN 1 ELSE 0 END AS has_active_stall
      FROM stall_owners o
      LEFT JOIN stalls s    ON s.id = o.stall_id
      LEFT JOIN buildings b ON b.id = s.building_id
      WHERE 1=1
    `;
    const params = [];
    if (building_id) { sql += ' AND b.id = ?'; params.push(building_id); }
    // Sort: active stall owners first, then past owners — all alphabetical
    sql += ' ORDER BY has_active_stall DESC, o.full_name ASC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('getAll owners error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  const { full_name, contact_number, address, stall_id } = req.body;
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ message: 'Full name is required.' });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO stall_owners (full_name, contact_number, address, stall_id) VALUES (?,?,?,?)',
      [full_name.trim(), contact_number || null, address || null, stall_id || null]
    );
    if (stall_id) {
      await db.execute("UPDATE stalls SET status='occupied' WHERE id=?", [stall_id]);
    }
    res.status(201).json({ id: result.insertId, message: 'Owner registered.' });
  } catch (err) {
    console.error('Create owner error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  const { full_name, contact_number, address, stall_id } = req.body;
  try {
    const [old] = await db.execute('SELECT stall_id FROM stall_owners WHERE id=?', [req.params.id]);
    const oldStallId = old[0]?.stall_id;

    await db.execute(
      'UPDATE stall_owners SET full_name=?, contact_number=?, address=?, stall_id=? WHERE id=?',
      [full_name, contact_number || null, address || null, stall_id || null, req.params.id]
    );

    if (oldStallId && String(oldStallId) !== String(stall_id)) {
      await db.execute("UPDATE stalls SET status='vacant' WHERE id=?", [oldStallId]);
    }
    if (stall_id) {
      await db.execute("UPDATE stalls SET status='occupied' WHERE id=?", [stall_id]);
    }
    res.json({ message: 'Owner updated.' });
  } catch (err) {
    console.error('Update owner error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const [ownerRows] = await db.execute(
      'SELECT id, stall_id FROM stall_owners WHERE id=?',
      [req.params.id]
    );
    if (ownerRows.length === 0) {
      return res.status(404).json({ message: 'Owner not found.' });
    }
    const stallId = ownerRows[0].stall_id;

    // Delete linked payments first
    const [payCount] = await db.execute(
      'SELECT COUNT(*) AS cnt FROM payments WHERE owner_id=?',
      [req.params.id]
    );
    if (Number(payCount[0].cnt) > 0) {
      await db.execute('DELETE FROM payments WHERE owner_id=?', [req.params.id]);
    }

    await db.execute('DELETE FROM stall_owners WHERE id=?', [req.params.id]);

    if (stallId) {
      await db.execute("UPDATE stalls SET status='vacant' WHERE id=?", [stallId]);
    }

    res.json({ message: 'Owner deleted successfully.' });
  } catch (err) {
    console.error('Delete owner error:', err.code, err.message);
    res.status(500).json({ message: 'Error deleting owner: ' + err.message });
  }
};

module.exports = { getAll, create, update, remove };