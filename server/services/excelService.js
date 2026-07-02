/**
 * excelService.js
 * Server-side Excel generation using ExcelJS.
 * Called from report routes when the client requests a server-generated Excel file.
 */

const ExcelJS = require('exceljs');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const GOV_NAVY  = 'FF1A2744';
const GOV_BLUE  = 'FF2C4A8C';
const GOV_GOLD  = 'FFC9A84C';
const GOV_CREAM = 'FFFFF8E1';

function borderAll(color = 'FFC8B99A') {
  const side = { style: 'thin', color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

function headerStyle(bgArgb, fontArgb = 'FFFFFFFF') {
  return {
    font: { bold: true, color: { argb: fontArgb }, size: 10, name: 'Calibri' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: borderAll(),
  };
}

function dataStyle(evenRow = false) {
  return {
    font: { name: 'Courier New', size: 9 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: evenRow ? GOV_CREAM : 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: borderAll(),
  };
}

/**
 * Generate a Payment Ledger workbook buffer.
 * @param {Array} owners   - Array of stall owner rows
 * @param {Array} payments - Array of payment rows
 * @param {number} year    - Fiscal year
 * @returns {Buffer} Excel file buffer
 */
async function generatePaymentLedger(owners, payments, year) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Treasurer's Office SRMS";
  wb.created = new Date();

  const ws = wb.addWorksheet(`Ledger ${year}`, {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  // ── Title block ────────────────────────────────────────────
  ws.mergeCells('A1:AN1');
  Object.assign(ws.getCell('A1'), {
    value: "Municipality of Santa Catalina\nMUNICIPAL TREASURER'S OFFICE",
    style: {
      font: { bold: true, size: 13, name: 'Times New Roman' },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    },
  });
  ws.getRow(1).height = 36;

  ws.mergeCells('A2:AN2');
  Object.assign(ws.getCell('A2'), {
    value: `STALL RENTAL PAYMENT MONITORING LEDGER — YEAR ${year}`,
    style: {
      font: { bold: true, size: 11, name: 'Times New Roman' },
      alignment: { horizontal: 'center', vertical: 'middle' },
    },
  });
  ws.getRow(2).height = 20;

  ws.addRow([]); // spacer

  // ── Header Row 1 (month names) ─────────────────────────────
  const hRow1 = ws.addRow([]);
  Object.assign(hRow1.getCell(1), {
    value: 'STALL OWNER / STALL NO.',
    style: headerStyle(GOV_NAVY, GOV_GOLD),
  });
  ws.mergeCells(`A4:A5`);

  let col = 2;
  MONTHS.forEach((month) => {
    hRow1.getCell(col).value = month.toUpperCase();
    Object.assign(hRow1.getCell(col), { style: headerStyle(GOV_NAVY, GOV_GOLD) });
    ws.mergeCells(4, col, 4, col + 2);
    col += 3;
  });

  // Total column header
  hRow1.getCell(col).value = 'ANNUAL TOTAL';
  Object.assign(hRow1.getCell(col), { style: headerStyle('FF8B1A1A', GOV_GOLD) });
  ws.mergeCells(`${ws.getRow(4).number}:${col}`, `${ws.getRow(5).number}:${col}`);

  ws.getRow(4).height = 20;

  // ── Header Row 2 (OR / Date / Amount sub-headers) ──────────
  const hRow2 = ws.addRow([]);
  col = 2;
  MONTHS.forEach(() => {
    ['OR No.', 'Date', 'Amount'].forEach((label, i) => {
      Object.assign(hRow2.getCell(col + i), { value: label, style: headerStyle(GOV_BLUE) });
    });
    col += 3;
  });
  ws.getRow(5).height = 16;

  // ── Build payment lookup map ───────────────────────────────
  // key: `${owner_id}_${monthIndex 0-based}`
  const payMap = {};
  payments.forEach((p) => {
    const mo = new Date(p.payment_date).getMonth();
    payMap[`${p.owner_id}_${mo}`] = p;
  });

  // ── Data rows ──────────────────────────────────────────────
  owners.forEach((owner, idx) => {
    const row = ws.addRow([]);
    const even = idx % 2 === 0;

    Object.assign(row.getCell(1), {
      value: `${owner.full_name}\n${owner.stall_number || ''}`,
      style: {
        font: { bold: true, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F0E8' } },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
        border: borderAll(),
      },
    });

    let rowTotal = 0;
    let c = 2;

    for (let mo = 0; mo < 12; mo++) {
      const p = payMap[`${owner.id}_${mo}`];
      if (p) {
        const amt = Number(p.total_amount);
        rowTotal += amt;

        Object.assign(row.getCell(c),     { value: p.or_number, style: { ...dataStyle(even), font: { name: 'Courier New', size: 9, color: { argb: 'FF8B1A1A' } } } });
        Object.assign(row.getCell(c + 1), {
          value: new Date(p.payment_date).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit' }),
          style: dataStyle(even),
        });
        Object.assign(row.getCell(c + 2), {
          value: amt,
          style: { ...dataStyle(even), numFmt: '#,##0.00', font: { name: 'Courier New', size: 9, color: { argb: 'FF1A5C2A' } } },
        });
      } else {
        [c, c + 1, c + 2].forEach((ci) => {
          Object.assign(row.getCell(ci), {
            value: '',
            style: { ...dataStyle(even), font: { name: 'Courier New', size: 9, color: { argb: 'FFC8B99A' } } },
          });
        });
      }
      c += 3;
    }

    // Annual total cell
    Object.assign(row.getCell(c), {
      value: rowTotal,
      style: {
        numFmt: '#,##0.00',
        font: { bold: true, size: 9, name: 'Courier New', color: { argb: rowTotal > 0 ? 'FF1A5C2A' : 'FF8B1A1A' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C7' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: borderAll(),
      },
    });
    row.height = 18;
  });

  // ── Grand total footer ─────────────────────────────────────
  const ftRow = ws.addRow([]);
  Object.assign(ftRow.getCell(1), {
    value: 'GRAND TOTAL',
    style: {
      font: { bold: true, size: 10, name: 'Calibri', color: { argb: GOV_GOLD } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GOV_NAVY } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: borderAll(),
    },
  });

  let gc = 2;
  let grandTotal = 0;
  for (let mo = 0; mo < 12; mo++) {
    const monthSum = owners.reduce((sum, o) => {
      const p = payMap[`${o.id}_${mo}`];
      return sum + (p ? Number(p.total_amount) : 0);
    }, 0);
    grandTotal += monthSum;

    [gc, gc + 1].forEach(ci => {
      Object.assign(ftRow.getCell(ci), {
        value: '',
        style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GOV_NAVY } }, border: borderAll('FF3A5070') },
      });
    });
    Object.assign(ftRow.getCell(gc + 2), {
      value: monthSum || '',
      style: {
        numFmt: '#,##0.00',
        font: { bold: true, size: 9, name: 'Courier New', color: { argb: GOV_GOLD } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GOV_NAVY } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: borderAll('FF3A5070'),
      },
    });
    gc += 3;
  }

  // Grand total cell
  Object.assign(ftRow.getCell(gc), {
    value: grandTotal,
    style: {
      numFmt: '#,##0.00',
      font: { bold: true, size: 10, name: 'Courier New', color: { argb: GOV_GOLD } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GOV_NAVY } },
      alignment: { horizontal: 'right', vertical: 'middle' },
      border: borderAll(),
    },
  });
  ftRow.height = 22;

  // ── Column widths ──────────────────────────────────────────
  ws.getColumn(1).width = 24;
  for (let i = 2; i <= gc; i++) {
    const mod = (i - 2) % 3;
    ws.getColumn(i).width = mod === 0 ? 10 : mod === 1 ? 9 : 12;
  }
  ws.getColumn(gc).width = 15;

  return wb.xlsx.writeBuffer();
}

/**
 * Generate a Collection Report workbook buffer.
 * @param {Array} payments - Payment records
 * @param {number} year    - Fiscal year
 * @returns {Buffer} Excel file buffer
 */
async function generateCollectionReport(payments, year) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Collection Report');

  // Title
  ws.mergeCells('A1:G1');
  Object.assign(ws.getCell('A1'), {
    value: `MUNICIPAL TREASURER'S OFFICE — COLLECTION REPORT ${year}`,
    style: { font: { bold: true, size: 13, name: 'Times New Roman' }, alignment: { horizontal: 'center' } },
  });
  ws.getRow(1).height = 28;
  ws.addRow([]);

  // Headers
  const headers = ['OR Number', 'Date', 'Stall No.', 'Owner Name', 'Rental (₱)', 'Electric (₱)', 'Total (₱)'];
  const hRow = ws.addRow(headers);
  hRow.eachCell((cell) => Object.assign(cell, { style: headerStyle(GOV_NAVY) }));
  ws.getRow(3).height = 18;

  // Data
  let grandTotal = 0;
  payments.forEach((p, i) => {
    const row = ws.addRow([
      p.or_number,
      new Date(p.payment_date).toLocaleDateString('en-PH'),
      p.stall_number,
      p.owner_name,
      Number(p.rental_fee),
      Number(p.electric_fee),
      Number(p.total_amount),
    ]);
    grandTotal += Number(p.total_amount);
    row.eachCell((cell) => Object.assign(cell, { style: dataStyle(i % 2 === 0) }));
    ['E', 'F', 'G'].forEach((col) => { row.getCell(col).numFmt = '#,##0.00'; });
    row.height = 16;
  });

  // Grand total row
  const totalRow = ws.addRow(['', '', '', 'GRAND TOTAL', '', '', grandTotal]);
  Object.assign(totalRow.getCell(4), { style: headerStyle(GOV_NAVY, GOV_GOLD) });
  Object.assign(totalRow.getCell(7), {
    style: headerStyle(GOV_NAVY, GOV_GOLD),
    numFmt: '#,##0.00',
  });
  totalRow.height = 20;

  // Column widths
  ws.columns = [
    { width: 16 }, { width: 14 }, { width: 12 },
    { width: 28 }, { width: 14 }, { width: 14 }, { width: 16 },
  ];

  return wb.xlsx.writeBuffer();
}

module.exports = { generatePaymentLedger, generateCollectionReport };
