const db = require('../database/db');

// ── Stalls ────────────────────────────────────────────────────
const getAllStalls = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = 'SELECT * FROM night_market_stalls WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND (stall_number LIKE ? OR owner_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY stall_number';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createStall = async (req, res) => {
  const { stall_number, owner_name, contact_number, address,
          rental_rate, security_deposit, has_interest, interest_rate, status, date_started } = req.body;
  if (!stall_number || !owner_name)
    return res.status(400).json({ message: 'Stall number and owner name are required.' });
  try {
    const [result] = await db.execute(
      `INSERT INTO night_market_stalls
        (stall_number, owner_name, contact_number, address, rental_rate,
         security_deposit, has_interest, interest_rate, status, date_started)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [stall_number, owner_name, contact_number||null, address||null,
       rental_rate||0, security_deposit||0,
       has_interest ? 1 : 0, interest_rate||25,
       status||'occupied', date_started||null]
    );
    res.status(201).json({ id: result.insertId, message: 'Stall created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: `Stall number "${stall_number}" already exists.` });
    res.status(500).json({ message: err.message });
  }
};

const updateStall = async (req, res) => {
  const { stall_number, owner_name, contact_number, address,
          rental_rate, security_deposit, has_interest, interest_rate, status, date_started } = req.body;
  try {
    await db.execute(
      `UPDATE night_market_stalls
       SET stall_number=?, owner_name=?, contact_number=?, address=?,
           rental_rate=?, security_deposit=?, has_interest=?, interest_rate=?,
           status=?, date_started=? WHERE id=?`,
      [stall_number, owner_name, contact_number||null, address||null,
       rental_rate||0, security_deposit||0,
       has_interest ? 1 : 0, interest_rate||25,
       status||'occupied', date_started||null, req.params.id]
    );
    res.json({ message: 'Stall updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteStall = async (req, res) => {
  try {
    const [payments] = await db.execute(
      'SELECT COUNT(*) AS cnt FROM night_market_payments WHERE stall_id=?', [req.params.id]
    );
    if (Number(payments[0].cnt) > 0)
      return res.status(409).json({ message: 'Cannot delete: stall has payment records.' });
    await db.execute('DELETE FROM night_market_stalls WHERE id=?', [req.params.id]);
    res.json({ message: 'Stall deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Payments ──────────────────────────────────────────────────
const getAllPayments = async (req, res) => {
  try {
    const { year, month, stall_id } = req.query;
    let sql = `
      SELECT p.*, s.stall_number, s.owner_name, s.has_interest, s.interest_rate
      FROM night_market_payments p
      JOIN night_market_stalls s ON s.id = p.stall_id
      WHERE 1=1
    `;
    const params = [];
    if (year)     { sql += ' AND YEAR(p.payment_date) = ?';  params.push(year); }
    if (month)    { sql += ' AND MONTH(p.payment_date) = ?'; params.push(month); }
    if (stall_id) { sql += ' AND p.stall_id = ?';            params.push(stall_id); }
    sql += ' ORDER BY p.payment_date DESC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createPayment = async (req, res) => {
  const { stall_id, or_number, payment_date,
          payment_type = 'daily',
          rental_fee, electric_fee, electric_due,
          balance, apply_interest,
          total_amount, remarks } = req.body;

  if (!stall_id)     return res.status(400).json({ message: 'Stall is required.' });
  if (!or_number)    return res.status(400).json({ message: 'OR Number is required.' });
  if (!payment_date) return res.status(400).json({ message: 'Payment date is required.' });

  try {
    // Check duplicate OR
    const [dup] = await db.execute(
      'SELECT id FROM night_market_payments WHERE or_number=?', [or_number.toString().trim()]
    );
    if (dup.length > 0)
      return res.status(409).json({ message: `OR Number "${or_number}" already exists.` });

    const [stallRows] = await db.execute('SELECT * FROM night_market_stalls WHERE id=?', [stall_id]);
    const stall = stallRows[0];

    let finalRental   = 0;
    let finalElectric = 0;
    let finalBalance  = 0;
    let finalInterest = 0;
    let finalTotal    = 0;
    let finalRemarks  = remarks || null;

    if (payment_type === 'electric') {
      // Electric only — no interest ever
      finalElectric = parseFloat(electric_fee) || 0;
      finalTotal    = finalElectric;
      finalRemarks  = finalRemarks || 'Electric fee payment';
    } else {
      // Daily rental
      finalRental  = parseFloat(rental_fee)  || 0;
      finalBalance = parseFloat(balance)     || 0;

      // Balance interest only if stall has it enabled
      if (stall?.has_interest && apply_interest) {
        finalInterest = finalBalance * (parseFloat(stall.interest_rate) / 100);
      }
      finalTotal   = parseFloat(total_amount) || (finalRental + finalBalance + finalInterest);
      finalRemarks = finalRemarks || 'Daily rental payment';
    }

    // Check if electric_fee column exists, handle gracefully
    let insertSQL, insertParams;
    try {
      insertSQL = `INSERT INTO night_market_payments
        (stall_id, or_number, payment_type, payment_date,
         rental_fee, electric_fee, balance, interest, total_amount, remarks, recorded_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
      insertParams = [stall_id, or_number.toString().trim(), payment_type, payment_date,
        finalRental, finalElectric, finalBalance, finalInterest, finalTotal,
        finalRemarks, req.user?.id || null];
    } catch {
      // Fallback without electric_fee column
      insertSQL = `INSERT INTO night_market_payments
        (stall_id, or_number, payment_date, rental_fee, balance, interest, total_amount, remarks, recorded_by)
       VALUES (?,?,?,?,?,?,?,?,?)`;
      insertParams = [stall_id, or_number.toString().trim(), payment_date,
        finalRental, finalBalance, finalInterest, finalTotal,
        finalRemarks, req.user?.id || null];
    }

    const [result] = await db.execute(insertSQL, insertParams);
    res.status(201).json({ id: result.insertId, message: 'Payment recorded.', total: finalTotal });
  } catch (err) {
    console.error('Night market payment error:', err.message);
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: `OR Number "${or_number}" already exists.` });
    res.status(500).json({ message: err.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    await db.execute('DELETE FROM night_market_payments WHERE id=?', [req.params.id]);
    res.json({ message: 'Payment deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Summary (eye button) ──────────────────────────────────────
const getStallSummary = async (req, res) => {
  try {
    const [stallRows] = await db.execute('SELECT * FROM night_market_stalls WHERE id=?', [req.params.id]);
    if (!stallRows.length) return res.status(404).json({ message: 'Stall not found.' });

    const [payments] = await db.execute(
      'SELECT * FROM night_market_payments WHERE stall_id=? ORDER BY payment_date DESC',
      [req.params.id]
    );

    const totalPaid     = payments.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const totalRental   = payments.reduce((s, p) => s + Number(p.rental_fee   || 0), 0);
    const totalElectric = payments.reduce((s, p) => s + Number(p.electric_fee || 0), 0);
    const totalBalance  = payments.reduce((s, p) => s + Number(p.balance      || 0), 0);
    const totalInterest = payments.reduce((s, p) => s + Number(p.interest     || 0), 0);

    res.json({
      stall: stallRows[0],
      payments,
      totalPaid,
      totalRental,
      totalElectric,
      totalBalance,
      totalInterest,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Stats for dashboard ───────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const year  = req.query.year || new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const [[total]]    = await db.execute('SELECT COUNT(*) AS cnt FROM night_market_stalls');
    const [[occupied]] = await db.execute("SELECT COUNT(*) AS cnt FROM night_market_stalls WHERE status='occupied'");
    const [[monthly]]  = await db.execute(
      'SELECT COALESCE(SUM(total_amount),0) AS total FROM night_market_payments WHERE YEAR(payment_date)=? AND MONTH(payment_date)=?',
      [year, month]
    );
    const [[yearly]] = await db.execute(
      'SELECT COALESCE(SUM(total_amount),0) AS total FROM night_market_payments WHERE YEAR(payment_date)=?',
      [year]
    );

    res.json({
      total: total.cnt, occupied: occupied.cnt,
      vacant: total.cnt - occupied.cnt,
      monthlyRevenue: monthly.total,
      yearlyRevenue:  yearly.total,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Night Market Report ───────────────────────────────────────
const getReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    let sql = `
      SELECT p.*, s.stall_number, s.owner_name, s.contact_number,
             s.rental_rate, s.has_interest, s.interest_rate
      FROM night_market_payments p
      JOIN night_market_stalls s ON s.id = p.stall_id
      WHERE 1=1
    `;
    const params = [];
    if (year)  { sql += ' AND YEAR(p.payment_date) = ?';  params.push(year); }
    if (month) { sql += ' AND MONTH(p.payment_date) = ?'; params.push(month); }
    sql += ' ORDER BY p.payment_date DESC, s.stall_number';
    const [rows] = await db.execute(sql, params);

    const summary = {
      totalCollected: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      totalRental:    rows.reduce((s, r) => s + Number(r.rental_fee   || 0), 0),
      totalElectric:  rows.reduce((s, r) => s + Number(r.electric_fee || 0), 0),
      totalInterest:  rows.reduce((s, r) => s + Number(r.interest     || 0), 0),
      recordCount:    rows.length,
    };

    res.json({ payments: rows, summary });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getAllStalls, createStall, updateStall, deleteStall,
  getAllPayments, createPayment, deletePayment,
  getStallSummary, getStats, getReport,
};