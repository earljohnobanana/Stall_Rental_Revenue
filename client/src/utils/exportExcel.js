import ExcelJS from 'exceljs';

function saveAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

// ── Shared border style ──────────────────────────────────────────────────────
const border = {
  top:    { style: 'thin', color: { argb: 'FF000000' } },
  left:   { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right:  { style: 'thin', color: { argb: 'FF000000' } },
};

const thickBorder = {
  top:    { style: 'medium', color: { argb: 'FF000000' } },
  left:   { style: 'medium', color: { argb: 'FF000000' } },
  bottom: { style: 'medium', color: { argb: 'FF000000' } },
  right:  { style: 'medium', color: { argb: 'FF000000' } },
};

// ── Apply style helper ───────────────────────────────────────────────────────
function applyStyle(cell, style) {
  Object.assign(cell, { style });
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT PAYMENT LEDGER — Styled like a government ledger book
// ════════════════════════════════════════════════════════════════════════════
export async function exportPaymentLedger(owners, payments, year, filename = 'payment_ledger') {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Municipal Treasurer's Office SRMS";
  wb.created = new Date();

  const ws = wb.addWorksheet(`Ledger ${year}`, {
    pageSetup: {
      paperSize:   9,
      orientation: 'landscape',
      fitToPage:   true,
      fitToWidth:  1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
    properties: { tabColor: { argb: 'FF1A2744' } },
  });

  // ── Row 1: Municipality name ─────────────────────────────────────────────
  ws.mergeCells('A1:AN1');
  const r1 = ws.getCell('A1');
  r1.value = 'MUNICIPAL TREASURER\'S OFFICE';
  r1.font  = { bold: true, size: 14, name: 'Times New Roman' };
  r1.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(1).height = 22;

  // ── Row 2: System title ──────────────────────────────────────────────────
  ws.mergeCells('A2:AN2');
  const r2 = ws.getCell('A2');
  r2.value = 'STALL RENTAL PAYMENT MONITORING LEDGER';
  r2.font  = { bold: true, size: 12, name: 'Times New Roman', underline: true };
  r2.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // ── Row 3: spacer ────────────────────────────────────────────────────────
  ws.getRow(3).height = 6;

  // ── Row 4: Column headers — Month names ──────────────────────────────────
  // Col 1 = STALL OWNER / STALL NO.
  // Then each month: OR No. | Date | Amount  (3 cols per month = 36 cols)
  // Last col = ANNUAL TOTAL
  // Total columns: 1 + 36 + 1 = 38

  const headerRow1 = ws.getRow(4);
  const headerRow2 = ws.getRow(5);

  // Cell A4:A5 merged — STALL OWNER / STALL NO.
  ws.mergeCells('A4:A5');
  const ownerHeader = ws.getCell('A4');
  ownerHeader.value = 'STALL OWNER / STALL NO.';
  ownerHeader.font  = { bold: true, size: 9, name: 'Arial', color: { argb: 'FFFFFFFF' } };
  ownerHeader.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
  ownerHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ownerHeader.border = border;

  // Month headers — 3 cols each
  const monthStartCol = 2; // B = col 2
  MONTHS.forEach((month, mi) => {
    const startCol = monthStartCol + mi * 3;
    const endCol   = startCol + 2;

    // Row 4: merged month name
    const startColLetter = colLetter(startCol);
    const endColLetter   = colLetter(endCol);
    ws.mergeCells(`${startColLetter}4:${endColLetter}4`);
    const mCell = ws.getCell(`${startColLetter}4`);
    mCell.value = month;
    mCell.font  = { bold: true, size: 9, name: 'Arial', color: { argb: 'FFC9A84C' } };
    mCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
    mCell.alignment = { horizontal: 'center', vertical: 'middle' };
    mCell.border = border;

    // Row 5: OR No. | Date | Amount sub-headers
    const subHeaders = ['OR No.', 'Date', 'Amount'];
    subHeaders.forEach((label, si) => {
      const cell = ws.getCell(5, startCol + si);
      cell.value = label;
      cell.font  = { bold: true, size: 8, name: 'Arial', color: { argb: 'FFFFFFFF' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C4A8C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = border;
    });
  });

  // Annual Total header — col 38
  const totalCol = monthStartCol + 12 * 3; // = 38
  ws.mergeCells(`${colLetter(totalCol)}4:${colLetter(totalCol)}5`);
  const totalHeader = ws.getCell(4, totalCol);
  totalHeader.value = 'ANNUAL\nTOTAL';
  totalHeader.font  = { bold: true, size: 9, name: 'Arial', color: { argb: 'FFFFFFFF' } };
  totalHeader.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B1A1A' } };
  totalHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  totalHeader.border = border;

  ws.getRow(4).height = 20;
  ws.getRow(5).height = 16;

  // ── Build payment lookup: owner_id → month_index → payment ───────────────
  const payMap = {};
  payments.forEach(p => {
    const mo = new Date(p.payment_date).getMonth(); // 0-based
    if (!payMap[p.owner_id]) payMap[p.owner_id] = {};
    payMap[p.owner_id][mo] = p;
  });

  // ── Data rows ─────────────────────────────────────────────────────────────
  owners.forEach((owner, idx) => {
    const rowNum = 6 + idx;
    const even   = idx % 2 === 0;
    const rowBg  = even ? 'FFFFFFFF' : 'FFFFF8E7';
    const row    = ws.getRow(rowNum);

    // Owner name + stall number
    const ownerCell = row.getCell(1);
    ownerCell.value = `${owner.full_name || owner.owner_name || ''}\n${owner.stall_number || ''}`;
    ownerCell.font  = { bold: true, size: 9, name: 'Arial' };
    ownerCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F0E8' } };
    ownerCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ownerCell.border = border;

    let annualTotal = 0;

    for (let mo = 0; mo < 12; mo++) {
      const p        = (payMap[owner.id] || {})[mo];
      const startCol = monthStartCol + mo * 3;

      if (p) {
        const amt = Number(p.total_amount) || 0;
        annualTotal += amt;

        // OR No.
        const orCell = row.getCell(startCol);
        orCell.value = p.or_number || '';
        orCell.font  = { size: 8, name: 'Courier New', color: { argb: 'FF8B1A1A' } };
        orCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        orCell.alignment = { horizontal: 'center', vertical: 'middle' };
        orCell.border = border;

        // Date
        const dateStr = p.payment_date
          ? new Date(p.payment_date).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit' })
          : '';
        const dateCell = row.getCell(startCol + 1);
        dateCell.value = dateStr;
        dateCell.font  = { size: 8, name: 'Courier New' };
        dateCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
        dateCell.border = border;

        // Amount
        const amtCell = row.getCell(startCol + 2);
        amtCell.value  = amt;
        amtCell.numFmt = '#,##0.00';
        amtCell.font   = { size: 8, name: 'Courier New', color: { argb: 'FF1A5C2A' } };
        amtCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        amtCell.alignment = { horizontal: 'right', vertical: 'middle' };
        amtCell.border = border;

      } else {
        // Empty cells
        for (let c = 0; c < 3; c++) {
          const emptyCell = row.getCell(startCol + c);
          emptyCell.value = '';
          emptyCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          emptyCell.border = border;
        }
      }
    }

    // Annual total
    const annCell = row.getCell(totalCol);
    annCell.value  = annualTotal || '';
    annCell.numFmt = '#,##0.00';
    annCell.font   = { bold: true, size: 9, name: 'Courier New',
                       color: { argb: annualTotal > 0 ? 'FF1A5C2A' : 'FF999999' } };
    annCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C7' } };
    annCell.alignment = { horizontal: 'right', vertical: 'middle' };
    annCell.border = border;

    row.height = 22;
  });

  // ── Grand total footer row ────────────────────────────────────────────────
  const ftRowNum = 6 + owners.length;
  const ftRow    = ws.getRow(ftRowNum);

  // Label
  const ftLabel = ftRow.getCell(1);
  ftLabel.value = 'GRAND TOTAL';
  ftLabel.font  = { bold: true, size: 10, name: 'Arial', color: { argb: 'FFC9A84C' } };
  ftLabel.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
  ftLabel.alignment = { horizontal: 'center', vertical: 'middle' };
  ftLabel.border = thickBorder;

  let grandTotal = 0;

  for (let mo = 0; mo < 12; mo++) {
    const startCol   = monthStartCol + mo * 3;
    const monthTotal = owners.reduce((sum, o) => {
      const p = (payMap[o.id] || {})[mo];
      return sum + (p ? Number(p.total_amount) : 0);
    }, 0);
    grandTotal += monthTotal;

    // OR / Date — blank
    for (let c = 0; c < 2; c++) {
      const cell = ftRow.getCell(startCol + c);
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
      cell.border = thickBorder;
    }

    // Amount total
    const sumCell = ftRow.getCell(startCol + 2);
    sumCell.value  = monthTotal || '';
    sumCell.numFmt = '#,##0.00';
    sumCell.font   = { bold: true, size: 8, name: 'Courier New', color: { argb: 'FFC9A84C' } };
    sumCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
    sumCell.alignment = { horizontal: 'right', vertical: 'middle' };
    sumCell.border = thickBorder;
  }

  // Grand total cell
  const grandCell = ftRow.getCell(totalCol);
  grandCell.value  = grandTotal;
  grandCell.numFmt = '#,##0.00';
  grandCell.font   = { bold: true, size: 10, name: 'Courier New', color: { argb: 'FFC9A84C' } };
  grandCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
  grandCell.alignment = { horizontal: 'right', vertical: 'middle' };
  grandCell.border = thickBorder;
  ftRow.height = 22;

  // ── Column widths ─────────────────────────────────────────────────────────
  ws.getColumn(1).width = 22; // owner name
  for (let mo = 0; mo < 12; mo++) {
    const startCol = monthStartCol + mo * 3;
    ws.getColumn(startCol).width     = 10; // OR No.
    ws.getColumn(startCol + 1).width = 7;  // Date
    ws.getColumn(startCol + 2).width = 10; // Amount
  }
  ws.getColumn(totalCol).width = 13; // Annual total

  // ── Freeze header rows and owner column ───────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 5 }];

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}_${year}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT COLLECTION REPORT — Clean tabular format
// ════════════════════════════════════════════════════════════════════════════
export async function exportCollectionReport(payments, filename = 'collection_report') {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Municipal Treasurer's Office SRMS";
  wb.created = new Date();

  const ws = wb.addWorksheet('Collection Report', {
    pageSetup: {
      paperSize: 9, orientation: 'portrait',
      fitToPage: true, fitToWidth: 1,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
  });

  // ── Header block ──────────────────────────────────────────────────────────
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = "TREASURER'S OFFICE – COLLECTION REPORT";
  ws.getCell('A1').font  = { bold: true, size: 14, name: 'Times New Roman' };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.getRow(2).height = 8; // spacer

  // ── Column header row ─────────────────────────────────────────────────────
  const headers = ['OR Number', 'Date', 'Stall No.', 'Owner Name', 'Rental (₱)', 'Electric (₱)', 'Total (₱)'];
  const colWidths = [14, 14, 12, 30, 14, 14, 14];
  const hRow = ws.getRow(3);
  hRow.height = 18;

  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.font  = { bold: true, size: 10, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = border;
    ws.getColumn(i + 1).width = colWidths[i];
  });

  // ── Data rows ─────────────────────────────────────────────────────────────
  let grandTotal    = 0;
  let rentalTotal   = 0;
  let electricTotal = 0;

  payments.forEach((p, idx) => {
    const rowNum = 4 + idx;
    const even   = idx % 2 === 0;
    const bg     = even ? 'FFFFFFFF' : 'FFF5F5F5';
    const row    = ws.getRow(rowNum);
    row.height   = 16;

    const dateStr = p.payment_date
      ? new Date(p.payment_date).toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '';

    const rental   = Number(p.rental_fee)   || 0;
    const electric = Number(p.electric_fee) || 0;
    const total    = Number(p.total_amount) || 0;

    rentalTotal   += rental;
    electricTotal += electric;
    grandTotal    += total;

    const rowData = [p.or_number, dateStr, p.stall_number, p.owner_name, rental, electric, total];

    rowData.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val;
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = border;

      if (ci === 0) { // OR Number
        cell.font = { bold: true, size: 9, name: 'Courier New', color: { argb: 'FF8B1A1A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (ci === 1) { // Date
        cell.font = { size: 9, name: 'Courier New' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (ci === 2) { // Stall No.
        cell.font = { bold: true, size: 9, name: 'Courier New', color: { argb: 'FF2C4A8C' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (ci === 3) { // Owner
        cell.font = { size: 9, name: 'Arial' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else { // Amounts
        cell.numFmt = '#,##0.00';
        cell.font   = { size: 9, name: 'Courier New' };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  });

  // ── Subtotals row ─────────────────────────────────────────────────────────
  const subRowNum = 4 + payments.length;
  const subRow    = ws.getRow(subRowNum);
  subRow.height   = 16;

  [1,2,3].forEach(c => {
    const cell = subRow.getCell(c);
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECF5' } };
    cell.border = border;
  });

  const subLabel = subRow.getCell(4);
  subLabel.value = 'SUB TOTALS';
  subLabel.font  = { bold: true, size: 9, name: 'Arial' };
  subLabel.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECF5' } };
  subLabel.alignment = { horizontal: 'right', vertical: 'middle' };
  subLabel.border = border;

  [[5, rentalTotal],[6, electricTotal],[7, grandTotal]].forEach(([col, val]) => {
    const cell = subRow.getCell(col);
    cell.value  = val;
    cell.numFmt = '#,##0.00';
    cell.font   = { bold: true, size: 9, name: 'Courier New' };
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECF5' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = border;
  });

  // ── Grand total row ───────────────────────────────────────────────────────
  const gtRowNum = subRowNum + 1;
  const gtRow    = ws.getRow(gtRowNum);
  gtRow.height   = 20;

  [1,2,3,4,5,6].forEach(c => {
    const cell = gtRow.getCell(c);
    if (c === 4) {
      cell.value = 'GRAND TOTAL';
      cell.font  = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFC9A84C' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
    cell.border = thickBorder;
  });

  const gtTotal = gtRow.getCell(7);
  gtTotal.value  = grandTotal;
  gtTotal.numFmt = '#,##0.00';
  gtTotal.font   = { bold: true, size: 12, name: 'Courier New', color: { argb: 'FFC9A84C' } };
  gtTotal.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2744' } };
  gtTotal.alignment = { horizontal: 'right', vertical: 'middle' };
  gtTotal.border = thickBorder;

  const buffer = await wb.xlsx.writeBuffer();
  const year   = payments[0]?.payment_date ? new Date(payments[0].payment_date).getFullYear() : new Date().getFullYear();
  saveAs(new Blob([buffer]), `${filename}_${year}.xlsx`);
}

// ── Helper: column number → Excel letter (1=A, 2=B, 27=AA, etc.) ────────────
function colLetter(n) {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}