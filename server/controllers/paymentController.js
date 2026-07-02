const db = require('../database/db');
const { recordBalance } = require('./balanceController');

function getDeadline(year, month) {
  const d = new Date(year, month - 1, 20);
  const day = d.getDay();
  if (day === 6) return new Date(year, month - 1, 23);
  if (day === 0) return new Date(year, month - 1, 22);
  return d;
}

function isLatePayment(dateStr) {
  const d  = new Date(dateStr);
  const dl = getDeadline(d.getFullYear(), d.getMonth() + 1);
  dl.setHours(23, 59, 59, 999);
  return d > dl;
}

const getAll = async (req, res) => {
  try {
    const { year, month, building_id, owner_id, stall_id } = req.query;
    let sql = `
      SELECT p.*,
             o.full_name AS owner_name,
             s.stall_number,
             b.name AS building_name
      FROM payments p
      LEFT JOIN stall_owners o ON o.id = p.owner_id
      LEFT JOIN stalls s       ON s.id = COALESCE(p.stall_id, o.stall_id)
      LEFT JOIN buildings b    ON b.id = s.building_id
      WHERE 1=1
    `;
    const params = [];
    if (year)       { sql += ' AND YEAR(p.payment_date) = ?';  params.push(year); }
    if (month)      { sql += ' AND MONTH(p.payment_date) = ?'; params.push(month); }
    if (building_id){ sql += ' AND b.id = ?';                  params.push(building_id); }
    if (owner_id)   { sql += ' AND p.owner_id = ?';            params.push(owner_id); }
    if (stall_id)   {
      // p.stall_id is the explicit link; o.stall_id is the owner's current stall
      sql += ' AND (p.stall_id = ? OR (p.stall_id IS NULL AND o.stall_id = ?))';
      params.push(stall_id, stall_id);
    }
    sql += ' ORDER BY p.payment_date DESC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  const {
    owner_id, or_number, payment_date,
    payment_type = 'rental',
    rental_fee, electric_fee, electric_due,
    security_deposit,
    is_first_monthly, total_amount, remarks,
    settle_balance_ids = [],
    force_duplicate = false,
    stall_id_override = null,
  } = req.body;

  if (!owner_id)                     return res.status(400).json({ message: 'Please select a stall owner.' });
  if (!or_number?.toString().trim()) return res.status(400).json({ message: 'OR Number is required.' });
  if (!payment_date)                 return res.status(400).json({ message: 'Payment date is required.' });

  try {
    // Duplicate OR check
    const [existing] = await db.execute(
      'SELECT id, owner_id FROM payments WHERE or_number = ?',
      [or_number.toString().trim()]
    );

    if (existing.length > 0) {
      if (existing.some(r => String(r.owner_id) === String(owner_id))) {
        return res.status(409).json({
          message: `OR Number "${or_number}" already exists for this owner.`,
          duplicate: true, same_owner: true,
        });
      }
      if (!force_duplicate) {
        return res.status(409).json({
          message: `OR Number "${or_number}" exists for a different owner. Click "Post Anyway" to proceed.`,
          duplicate: true, same_owner: false,
        });
      }
    }

    // Get owner info
    const [ownerRows] = await db.execute(`
      SELECT o.*, s.rental_rate, s.id AS stall_table_id
      FROM stall_owners o
      LEFT JOIN stalls s ON s.id = o.stall_id
      WHERE o.id = ?
    `, [owner_id]);
    const owner = ownerRows[0];

    const pDate  = new Date(payment_date);
    const pMonth = pDate.getMonth() + 1;
    const pYear  = pDate.getFullYear();

    // Determine stall_id — use override for past owners, otherwise owner's current stall
    let stallId = stall_id_override
      ? parseInt(stall_id_override)
      : (owner?.stall_id || null);

    let finalRental   = 0;
    let finalElectric = 0;
    let finalTotal    = 0;
    let finalRemarks  = remarks || null;
    let dbPaymentType = payment_type; // preserve the original type

    if (payment_type === 'security_deposit') {
      finalTotal    = parseFloat(security_deposit) || 0;
      finalRemarks  = finalRemarks || 'Security Deposit (non-refundable)';
      dbPaymentType = 'security_deposit';

    } else if (payment_type === 'electric') {
      finalElectric = parseFloat(electric_fee) || 0;
      finalTotal    = finalElectric;
      dbPaymentType = 'electric'; // always save as electric
      const elecDue = parseFloat(electric_due) || 0;
      if (elecDue > 0 && finalElectric < elecDue) {
        await recordBalance(owner_id, pMonth, pYear, 0, 0, elecDue, finalElectric);
      }

    } else {
      // Rental payment
      finalRental   = parseFloat(rental_fee) || 0;
      dbPaymentType = 'monthly'; // rental saved as monthly

      const actuallyLate  = !is_first_monthly && isLatePayment(payment_date);
      const serverLateInt = actuallyLate ? +(finalRental * 0.25).toFixed(2) : 0;
      finalTotal = parseFloat(total_amount) || (finalRental + serverLateInt);

      if (actuallyLate && serverLateInt > 0) {
        finalRemarks = finalRemarks || `Late rental — 25% interest: ₱${serverLateInt.toFixed(2)}`;
      } else if (is_first_monthly) {
        finalRemarks = finalRemarks || 'First rental payment — no interest';
      }

      if (!is_first_monthly && owner?.rental_rate) {
        const rentalDue = parseFloat(owner.rental_rate) || 0;
        if (finalRental < rentalDue) {
          await recordBalance(owner_id, pMonth, pYear, rentalDue, finalRental, 0, 0);
        }
      }
    }

    // Insert payment
    const [result] = await db.execute(
      `INSERT INTO payments
        (owner_id, stall_id, or_number, payment_type, payment_date,
         rental_fee, electric_fee, total_amount, remarks, recorded_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        owner_id, stallId,
        or_number.toString().trim(), dbPaymentType, payment_date,
        finalRental, finalElectric, finalTotal,
        finalRemarks, req.user?.id || null,
      ]
    );

    // Settle balances
    for (const bid of settle_balance_ids) {
      await db.execute('UPDATE payment_balances SET is_settled = 1 WHERE id = ?', [bid]);
    }

    res.status(201).json({ id: result.insertId, message: 'Payment recorded.' });
  } catch (err) {
    console.error('Create payment error:', err.code, err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `OR Number "${or_number}" already exists.`, duplicate: true });
    }
    res.status(500).json({ message: 'Error saving payment: ' + err.message });
  }
};

const update = async (req, res) => {
  const { owner_id, or_number, payment_date, rental_fee, electric_fee, total_amount, remarks } = req.body;
  if (!or_number || !payment_date) {
    return res.status(400).json({ message: 'OR Number and payment date are required.' });
  }
  try {
    await db.execute(
      `UPDATE payments SET owner_id=?, or_number=?, payment_date=?,
       rental_fee=?, electric_fee=?, total_amount=?, remarks=? WHERE id=?`,
      [
        owner_id, or_number.toString().trim(), payment_date,
        parseFloat(rental_fee) || 0, parseFloat(electric_fee) || 0,
        parseFloat(total_amount) || 0, remarks || null, req.params.id,
      ]
    );
    res.json({ message: 'Payment updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating: ' + err.message });
  }
};

const remove = async (req, res) => {
  try {
    await db.execute('DELETE FROM payments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Payment deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting: ' + err.message });
  }
};

module.exports = { getAll, create, update, remove };