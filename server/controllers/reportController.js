const db = require('../database/db');

const getReport = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');

    const { years, month, building_id, payment_type, owner_name } = req.query;

    console.log('[Report] Query:', { years, month, building_id, payment_type, owner_name });

    let sql = `
      SELECT p.*,
             COALESCE(o.full_name, 'Unknown')  AS owner_name,
             COALESCE(s.stall_number, '')       AS stall_number,
             COALESCE(b.name, '')               AS building_name
      FROM payments p
      LEFT JOIN stall_owners o ON o.id = p.owner_id
      LEFT JOIN stalls s       ON s.id = COALESCE(p.stall_id, o.stall_id)
      LEFT JOIN buildings b    ON b.id = s.building_id
      WHERE 1=1
    `;
    const params = [];

    // ── Multi-year filter ──────────────────────────────────
    // years = '2026' | '2025,2026' | '' (all years)
    if (years && years.trim() !== '') {
      const yearList = years.split(',')
        .map(y => parseInt(y.trim()))
        .filter(y => !isNaN(y));
      if (yearList.length === 1) {
        sql += ' AND YEAR(p.payment_date) = ?';
        params.push(yearList[0]);
      } else if (yearList.length > 1) {
        sql += ` AND YEAR(p.payment_date) IN (${yearList.map(() => '?').join(',')})`;
        params.push(...yearList);
      }
    }
    // If years is empty/missing → no year filter = all years

    // ── Month filter ───────────────────────────────────────
    if (month && month.trim() !== '') {
      sql += ' AND MONTH(p.payment_date) = ?';
      params.push(month);
    }

    // ── Building filter ────────────────────────────────────
    if (building_id && building_id.trim() !== '') {
      sql += ' AND b.id = ?';
      params.push(building_id);
    }

    // ── Payment type filter ────────────────────────────────
    if (payment_type && payment_type.trim() !== '') {
      if (payment_type === 'rental') {
        sql += ' AND p.rental_fee > 0';
      } else if (payment_type === 'electric') {
        sql += ' AND p.electric_fee > 0';
      } else if (payment_type === 'security_deposit') {
        sql += " AND p.payment_type = 'security_deposit'";
      }
    }

    // ── Owner name filter (partial match) ──────────────────
    if (owner_name && owner_name.trim() !== '') {
      sql += ' AND o.full_name LIKE ?';
      params.push(`%${owner_name.trim()}%`);
    }

    sql += ' ORDER BY p.payment_date DESC, b.name ASC, s.stall_number ASC';

    console.log('[Report] Params:', params);
    const [rows] = await db.execute(sql, params);
    console.log('[Report] Rows returned:', rows.length);

    res.json(rows);
  } catch (err) {
    console.error('[Report] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getReport };