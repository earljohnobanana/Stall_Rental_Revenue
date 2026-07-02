const db = require('../database/db');

const getAll = async (req, res) => {
  try {
    const { status, building_id } = req.query;
    let sql = `
      SELECT s.*, b.name AS building_name, sc.name AS category_name,
             o.full_name AS owner_name, o.id AS owner_id,
             o.contact_number, o.address
      FROM stalls s
      LEFT JOIN buildings b         ON b.id  = s.building_id
      LEFT JOIN stall_categories sc ON sc.id = s.category_id
      LEFT JOIN stall_owners o      ON o.stall_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (status)      { sql += ' AND s.status = ?';      params.push(status); }
    if (building_id) { sql += ' AND s.building_id = ?'; params.push(building_id); }
    sql += ' ORDER BY b.name, s.stall_number';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, b.name AS building_name, sc.name AS category_name,
             o.full_name AS owner_name, o.id AS owner_id,
             o.contact_number, o.address
      FROM stalls s
      LEFT JOIN buildings b         ON b.id  = s.building_id
      LEFT JOIN stall_categories sc ON sc.id = s.category_id
      LEFT JOIN stall_owners o      ON o.stall_id = s.id
      WHERE s.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Stall not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET stall history
const getHistory = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT * FROM stall_history
      WHERE stall_id = ?
      ORDER BY date_ended DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  const {
    stall_number, building_id, category_id,
    rental_rate, security_deposit, status, date_started,
    owner_name, contact_number, address,
  } = req.body;

  if (!stall_number || !building_id) {
    return res.status(400).json({ message: 'Stall number and building are required.' });
  }

  try {
    const [stallResult] = await db.execute(
      `INSERT INTO stalls
        (stall_number, building_id, category_id, rental_rate, security_deposit, electric_fee, status, date_started)
       VALUES (?,?,?,?,?,0,?,?)`,
      [
        stall_number, building_id, category_id || null,
        rental_rate || 0, security_deposit || 0,
        owner_name?.trim() ? 'occupied' : (status || 'vacant'),
        date_started || null,
      ]
    );
    const stallId = stallResult.insertId;

    if (owner_name?.trim()) {
      await db.execute(
        'INSERT INTO stall_owners (full_name, contact_number, address, stall_id) VALUES (?,?,?,?)',
        [owner_name.trim(), contact_number || null, address || null, stallId]
      );
      await db.execute("UPDATE stalls SET status='occupied' WHERE id=?", [stallId]);
    }

    res.status(201).json({ id: stallId, message: 'Stall saved successfully.' });
  } catch (err) {
    console.error('Create stall error:', err.code, err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Stall number "${stall_number}" already exists in this building.` });
    }
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  const {
    stall_number, building_id, category_id,
    rental_rate, security_deposit, status, date_started,
    owner_name, contact_number, address, owner_id,
    // Transfer fields
    transfer_date, transfer_remarks,
  } = req.body;

  try {
    const stallId = req.params.id;

    // Get current stall info
    const [currentStall] = await db.execute(
      `SELECT s.*, o.id AS owner_id, o.full_name AS owner_name,
              o.contact_number, o.address
       FROM stalls s
       LEFT JOIN stall_owners o ON o.stall_id = s.id
       WHERE s.id = ?`,
      [stallId]
    );
    const current = currentStall[0];

    // Detect owner change (transfer)
    const isTransfer = owner_name?.trim() &&
                       current?.owner_name &&
                       owner_name.trim().toLowerCase() !== current.owner_name.toLowerCase();

    if (isTransfer) {
      // ── TRANSFER: archive old owner to history ────────────────────────
      await db.execute(
        `INSERT INTO stall_history
          (stall_id, stall_number, owner_name, contact_number, address,
           rental_rate, security_deposit, date_started, date_ended, remarks, recorded_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          stallId,
          current.stall_number,
          current.owner_name,
          current.contact_number || null,
          current.address        || null,
          current.rental_rate    || 0,
          current.security_deposit || 0,
          current.date_started   || null,
          transfer_date          || new Date().toISOString().split('T')[0],
          transfer_remarks       || 'Contract ended / Stall transferred',
          req.user?.id           || null,
        ]
      );

      // Update existing owner record with new owner info
      if (current.owner_id) {
        await db.execute(
          'UPDATE stall_owners SET full_name=?, contact_number=?, address=? WHERE id=?',
          [owner_name.trim(), contact_number || null, address || null, current.owner_id]
        );
      } else {
        await db.execute(
          'INSERT INTO stall_owners (full_name, contact_number, address, stall_id) VALUES (?,?,?,?)',
          [owner_name.trim(), contact_number || null, address || null, stallId]
        );
      }

    } else if (owner_name?.trim()) {
      // ── UPDATE: same owner, just update info ──────────────────────────
      if (current?.owner_id) {
        await db.execute(
          'UPDATE stall_owners SET full_name=?, contact_number=?, address=? WHERE id=?',
          [owner_name.trim(), contact_number || null, address || null, current.owner_id]
        );
      } else {
        await db.execute(
          'INSERT INTO stall_owners (full_name, contact_number, address, stall_id) VALUES (?,?,?,?)',
          [owner_name.trim(), contact_number || null, address || null, stallId]
        );
      }
    } else if (!owner_name?.trim() && current?.owner_id) {
      // ── VACATE: archive old owner then remove ────────────────────────
      await db.execute(
        `INSERT INTO stall_history
          (stall_id, stall_number, owner_name, contact_number, address,
           rental_rate, security_deposit, date_started, date_ended, remarks, recorded_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          stallId, current.stall_number, current.owner_name,
          current.contact_number || null, current.address || null,
          current.rental_rate || 0, current.security_deposit || 0,
          current.date_started || null,
          transfer_date || new Date().toISOString().split('T')[0],
          transfer_remarks || 'Contract ended / Stall vacated',
          req.user?.id || null,
        ]
      );
      await db.execute('DELETE FROM stall_owners WHERE id=?', [current.owner_id]);
    }

    // Update stall details
    const finalStatus = owner_name?.trim() ? 'occupied' : (status || 'vacant');
    await db.execute(
      `UPDATE stalls
       SET stall_number=?, building_id=?, category_id=?,
           rental_rate=?, security_deposit=?, status=?, date_started=?
       WHERE id=?`,
      [
        stall_number, building_id, category_id || null,
        rental_rate || 0, security_deposit || 0,
        finalStatus,
        isTransfer ? (transfer_date || new Date().toISOString().split('T')[0]) : (date_started || null),
        stallId,
      ]
    );

    res.json({
      message: isTransfer
        ? `Stall transferred to ${owner_name}. Previous owner archived in history.`
        : 'Stall updated successfully.',
      transferred: isTransfer,
    });
  } catch (err) {
    console.error('Update stall error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await db.execute('DELETE FROM stall_owners WHERE stall_id=?', [req.params.id]);
    await db.execute('DELETE FROM stalls WHERE id=?', [req.params.id]);
    res.json({ message: 'Stall deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST manually add a past owner record
const addHistory = async (req, res) => {
  const { stall_number, owner_name, contact_number, address,
          rental_rate, security_deposit, date_started, date_ended, remarks } = req.body;

  if (!owner_name?.trim()) return res.status(400).json({ message: 'Owner name is required.' });
  if (!date_ended)         return res.status(400).json({ message: 'Date ended is required.' });

  try {
    // Get stall number if not provided
    let stallNum = stall_number;
    if (!stallNum) {
      const [stallRows] = await db.execute('SELECT stall_number FROM stalls WHERE id=?', [req.params.id]);
      stallNum = stallRows[0]?.stall_number || '';
    }

    const [result] = await db.execute(
      `INSERT INTO stall_history
        (stall_id, stall_number, owner_name, contact_number, address,
         rental_rate, security_deposit, date_started, date_ended, remarks, recorded_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.params.id, stallNum, owner_name.trim(),
        contact_number || null, address || null,
        parseFloat(rental_rate) || 0, parseFloat(security_deposit) || 0,
        date_started || null, date_ended,
        remarks || null, req.user?.id || null,
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Past owner record added successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all stall history across all stalls (for past owner search)
const getAllHistory = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT DISTINCT sh.id, sh.stall_id, sh.stall_number,
             sh.owner_name, sh.contact_number, sh.address,
             sh.rental_rate, sh.security_deposit,
             sh.date_started, sh.date_ended, sh.remarks
      FROM stall_history sh
      ORDER BY sh.owner_name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteHistory = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM stall_history WHERE id = ? AND stall_id = ?',
      [req.params.hid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Past owner record not found.' });
    await db.execute('DELETE FROM stall_history WHERE id = ?', [req.params.hid]);
    res.json({ message: 'Past owner record deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove, getHistory, addHistory, getAllHistory, deleteHistory };