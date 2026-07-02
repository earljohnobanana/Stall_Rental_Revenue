const db = require('../database/db');

/**
 * INTEREST DEADLINE RULES:
 * - Payment due on the 20th of each month
 * - If 20th falls on Saturday → deadline extends to Tuesday (Mon = grace)
 * - If 20th falls on Sunday  → deadline extends to Tuesday (Mon = grace)
 * - If 20th falls on Monday-Friday → deadline is the 20th itself
 * - Interest of 25% SIMPLE applies AFTER the deadline passes
 * - Electric balance: NO interest ever
 */
function getInterestDeadline(year, month) {
  // The 20th of the given month
  const twentieth = new Date(year, month - 1, 20);
  const dayOfWeek = twentieth.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  if (dayOfWeek === 6) {
    // Saturday → deadline is Tuesday (skip Sun, Mon grace)
    return new Date(year, month - 1, 23);
  } else if (dayOfWeek === 0) {
    // Sunday → deadline is Tuesday (skip Mon grace)
    return new Date(year, month - 1, 22);
  } else {
    // Weekday → deadline is the 20th
    return twentieth;
  }
}

/**
 * Calculate how many interest periods have passed based on payment date
 * Each period = one month where payment was made AFTER the deadline
 */
function calculateInterestPeriods(balMonth, balYear, paymentDate) {
  const refDate  = paymentDate ? new Date(paymentDate) : new Date();
  const refMonth = refDate.getMonth() + 1;
  const refYear  = refDate.getFullYear();

  // How many months elapsed since balance was created
  const monthsElapsed = (refYear - balYear) * 12 + (refMonth - balMonth);

  if (monthsElapsed <= 0) {
    // Same month as balance → no interest
    return { periods: 0, deadlineStr: null };
  }

  // The interest deadline for the FIRST period is the 20th (or Tue) of balMonth+1
  const firstDeadlineMonth = balMonth === 12 ? 1 : balMonth + 1;
  const firstDeadlineYear  = balMonth === 12 ? balYear + 1 : balYear;
  const firstDeadline      = getInterestDeadline(firstDeadlineYear, firstDeadlineMonth);

  if (monthsElapsed === 1) {
    // Still in the first penalty month
    // Interest applies only if payment date is AFTER the deadline day (not on it)
    firstDeadline.setHours(23, 59, 59, 999);
    const hasInterest = refDate > firstDeadline;
    const deadlineStr = firstDeadline.toLocaleDateString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    return { periods: hasInterest ? 1 : 0, deadlineStr };
  }

  // More than 1 month elapsed
  // Count full months that have passed + check current month
  let periods = monthsElapsed - 1; // all previous full months

  // Check if current month's deadline has passed
  const currDeadline = getInterestDeadline(refYear, refMonth);
  currDeadline.setHours(23, 59, 59, 999);
  if (refDate > currDeadline) {
    periods += 1;
  }

  // Next upcoming deadline for display
  let nextDeadline = getInterestDeadline(refYear, refMonth);
  if (refDate > nextDeadline) {
    const nm = refMonth === 12 ? 1 : refMonth + 1;
    const ny = refMonth === 12 ? refYear + 1 : refYear;
    nextDeadline = getInterestDeadline(ny, nm);
  }

  const deadlineStr = nextDeadline.toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return { periods, deadlineStr };
}

function calculateInterest(balance, paymentDate) {
  const rentalBal   = Number(balance.rental_balance   || 0);
  const electricBal = Number(balance.electric_balance || 0);

  const balMonth = Number(balance.month);
  const balYear  = Number(balance.year);

  const { periods, deadlineStr } = calculateInterestPeriods(balMonth, balYear, paymentDate);

  // SIMPLE interest: original balance × 25% × number of periods
  const rentalInterest     = rentalBal * 0.25 * periods;
  const rentalWithInterest = rentalBal + rentalInterest;
  const totalDue           = rentalWithInterest + electricBal;

  // Get the deadline for the first interest period (for display)
  const firstDeadlineMonth = balMonth === 12 ? 1 : balMonth + 1;
  const firstDeadlineYear  = balMonth === 12 ? balYear + 1 : balYear;
  const firstDeadline      = getInterestDeadline(firstDeadlineYear, firstDeadlineMonth);
  const firstDeadlineStr   = firstDeadline.toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return {
    interestPeriods:     periods,
    rentalBal,
    electricBal,
    rentalInterest:      rentalInterest.toFixed(2),
    rentalWithInterest:  rentalWithInterest.toFixed(2),
    electricDue:         electricBal.toFixed(2),
    totalDue:            totalDue.toFixed(2),
    interestStarted:     periods > 0,
    nextDeadline:        deadlineStr,
    firstDeadline:       firstDeadlineStr,
  };
}

const getOwnerBalance = async (req, res) => {
  const { owner_id } = req.params;
  const paymentDate  = req.query.payment_date || null;

  try {
    const [ownerRows] = await db.execute(`
      SELECT o.*, s.rental_rate, s.stall_number, b.name AS building_name
      FROM stall_owners o
      LEFT JOIN stalls s    ON s.id  = o.stall_id
      LEFT JOIN buildings b ON b.id = s.building_id
      WHERE o.id = ?
    `, [owner_id]);

    if (!ownerRows.length) return res.status(404).json({ message: 'Owner not found.' });
    const owner = ownerRows[0];

    // ONLY read explicitly recorded balances — never auto-generate
    const [balances] = await db.execute(`
      SELECT * FROM payment_balances
      WHERE owner_id = ? AND is_settled = 0
      ORDER BY year ASC, month ASC
    `, [owner_id]);

    if (balances.length === 0) {
      return res.json({
        owner,
        has_balance:            false,
        total_rental_balance:   '0.00',
        total_rental_interest:  '0.00',
        total_electric_balance: '0.00',
        total_due:              '0.00',
        interest_rate:          25,
        balance_details:        [],
      });
    }

    let totalRentalBalance   = 0;
    let totalRentalInterest  = 0;
    let totalElectricBalance = 0;
    let totalDue             = 0;
    const balanceDetails     = [];

    balances.forEach(b => {
      const calc = calculateInterest(b, paymentDate);

      totalRentalBalance   += calc.rentalBal;
      totalRentalInterest  += Number(calc.rentalInterest);
      totalElectricBalance += calc.electricBal;
      totalDue             += Number(calc.totalDue);

      const monthName = new Date(b.year, b.month - 1)
        .toLocaleString('en-PH', { month: 'long', year: 'numeric' });

      balanceDetails.push({
        ...b,
        month_name:           monthName,
        interest_periods:     calc.interestPeriods,
        rental_balance:       calc.rentalBal.toFixed(2),
        rental_interest:      calc.rentalInterest,
        rental_with_interest: calc.rentalWithInterest,
        electric_balance:     calc.electricBal.toFixed(2),
        electric_due:         calc.electricDue,
        total_due:            calc.totalDue,
        interest_started:     calc.interestStarted,
        next_deadline:        calc.nextDeadline,
        first_deadline:       calc.firstDeadline,
      });
    });

    res.json({
      owner,
      has_balance:            true,
      total_rental_balance:   totalRentalBalance.toFixed(2),
      total_rental_interest:  totalRentalInterest.toFixed(2),
      total_electric_balance: totalElectricBalance.toFixed(2),
      total_due:              totalDue.toFixed(2),
      interest_rate:          25,
      balance_details:        balanceDetails,
    });
  } catch (err) {
    console.error('getOwnerBalance error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const recordBalance = async (owner_id, month, year, rental_due, rental_paid, electric_due, electric_paid) => {
  const rentalBalance   = Math.max(0, rental_due   - rental_paid);
  const electricBalance = Math.max(0, electric_due - electric_paid);

  if (rentalBalance <= 0 && electricBalance <= 0) {
    await db.execute(
      'UPDATE payment_balances SET is_settled = 1 WHERE owner_id = ? AND month = ? AND year = ?',
      [owner_id, month, year]
    );
    return;
  }

  await db.execute(`
    INSERT INTO payment_balances
      (owner_id, month, year, rental_balance, electric_balance, interest_rate, is_settled)
    VALUES (?,?,?,?,?,25,0)
    ON DUPLICATE KEY UPDATE
      rental_balance   = VALUES(rental_balance),
      electric_balance = VALUES(electric_balance),
      is_settled       = 0
  `, [owner_id, month, year, rentalBalance.toFixed(2), electricBalance.toFixed(2)]);
};

const settleBalance = async (req, res) => {
  try {
    await db.execute(
      'UPDATE payment_balances SET is_settled = 1 WHERE id = ?',
      [req.params.balance_id]
    );
    res.json({ message: 'Balance settled.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllBalances = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT pb.*, o.full_name, s.stall_number, b.name AS building_name
      FROM payment_balances pb
      JOIN stall_owners o   ON o.id  = pb.owner_id
      LEFT JOIN stalls s    ON s.id  = o.stall_id
      LEFT JOIN buildings b ON b.id  = s.building_id
      WHERE pb.is_settled = 0
      ORDER BY pb.year ASC, pb.month ASC, o.full_name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getOwnerBalance, recordBalance, settleBalance, getAllBalances };