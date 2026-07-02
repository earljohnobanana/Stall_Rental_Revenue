const db = require('../database/db');

const getStats = async (req, res) => {
  try {
    const year  = req.query.year  || new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const [[buildings]]  = await db.execute('SELECT COUNT(*) AS count FROM buildings');
    const [[allStalls]]  = await db.execute('SELECT COUNT(*) AS count FROM stalls');
    const [[occupied]]   = await db.execute("SELECT COUNT(*) AS count FROM stalls WHERE status='occupied'");
    const [[vacant]]     = await db.execute("SELECT COUNT(*) AS count FROM stalls WHERE status='vacant'");
    const [[delinquent]] = await db.execute("SELECT COUNT(*) AS count FROM stalls WHERE status='delinquent'");

    // Monthly revenue — current month of selected year
    const [[monthly]] = await db.execute(
      'SELECT COALESCE(SUM(total_amount),0) AS total FROM payments WHERE YEAR(payment_date)=? AND MONTH(payment_date)=?',
      [year, month]
    );
    const [[monthlyElec]] = await db.execute(
      'SELECT COALESCE(SUM(electric_fee),0) AS total FROM payments WHERE YEAR(payment_date)=? AND MONTH(payment_date)=?',
      [year, month]
    );

    // Total collections for the selected year
    const [[totalYear]] = await db.execute(
      'SELECT COALESCE(SUM(total_amount),0) AS total FROM payments WHERE YEAR(payment_date)=?',
      [year]
    );

    res.json({
      totalBuildings:  buildings.count,
      totalStalls:     allStalls.count,
      occupiedStalls:  occupied.count,
      vacantStalls:    vacant.count,
      delinquentStalls:delinquent.count,
      monthlyRevenue:  monthly.total,
      electricRevenue: monthlyElec.total,
      totalCollections:totalYear.total,
      unpaidAccounts:  delinquent.count,
      year:            Number(year),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const getRevenueByMonth = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  try {
    const [rows] = await db.execute(`
      SELECT
        MONTH(payment_date) AS mo,
        SUM(rental_fee)     AS rental,
        SUM(electric_fee)   AS electric,
        SUM(total_amount)   AS total
      FROM payments
      WHERE YEAR(payment_date) = ?
      GROUP BY MONTH(payment_date)
      ORDER BY mo
    `, [year]);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data   = MONTHS.map((m, i) => {
      const found = rows.find(r => Number(r.mo) === i + 1);
      return {
        month:   m,
        rental:  found ? Number(found.rental)  : 0,
        electric:found ? Number(found.electric): 0,
        total:   found ? Number(found.total)   : 0,
      };
    });
    res.json(data);
  } catch (err) {
    console.error('Revenue by month error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const getByBuilding = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  try {
    const [rows] = await db.execute(`
      SELECT
        b.name AS building,
        COALESCE(SUM(p.total_amount), 0) AS total
      FROM buildings b
      LEFT JOIN stalls s       ON s.building_id = b.id
      LEFT JOIN stall_owners o ON o.stall_id    = s.id
      LEFT JOIN payments p     ON p.owner_id    = o.id AND YEAR(p.payment_date) = ?
      GROUP BY b.id, b.name
      ORDER BY total DESC
    `, [year]);
    res.json(rows);
  } catch (err) {
    console.error('By building error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStats, getRevenueByMonth, getByBuilding };