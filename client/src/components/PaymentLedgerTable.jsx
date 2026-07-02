import { useState } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import '../styles/tables.css';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function PaymentLedgerTable({ owners = [], payments = [], year }) {
  const [hoveredRow, setHoveredRow] = useState(null);

  // Build payment map: { ownerId: { monthIndex: paymentObj } }
  const payMap = {};
  payments.forEach(p => {
    const d = new Date(p.payment_date);
    const mo = d.getMonth();
    if (!payMap[p.owner_id]) payMap[p.owner_id] = {};
    payMap[p.owner_id][mo] = p;
  });

  return (
    <div className="overflow-x-auto border-2 border-gov-border rounded">
      {/* Ledger Title Block */}
      <div className="bg-gov-navy text-center py-3 px-4">
        <p className="text-gov-gold font-serif font-bold text-sm tracking-widest uppercase">
         Municipality of Santa Catalina – Municipal Treasurer's Office
        </p>
        <p className="text-white/80 font-mono text-xs tracking-wider mt-1">
          STALL RENTAL PAYMENT MONITORING LEDGER — YEAR {year}
        </p>
      </div>

      <table className="ledger-table">
        <thead>
          <tr>
            <th className="ledger-month-header" rowSpan={2} style={{ minWidth: 140, background: '#1a2744' }}>
              STALL OWNER<br /><span className="text-gov-gold/70 text-xs">/ STALL NO.</span>
            </th>
            {MONTHS.map(m => (
              <th key={m} colSpan={3} className="ledger-month-header">{m.toUpperCase()}</th>
            ))}
            <th className="ledger-month-header" rowSpan={2} style={{ minWidth: 90, background: '#8b1a1a' }}>
              ANNUAL<br />TOTAL
            </th>
          </tr>
          <tr>
            {MONTHS.map(m => (
              <>
                <th key={`${m}-or`} className="ledger-sub-header">OR No.</th>
                <th key={`${m}-date`} className="ledger-sub-header">Date</th>
                <th key={`${m}-amt`} className="ledger-sub-header">Amount</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {owners.length === 0 ? (
            <tr>
              <td colSpan={38} className="text-center py-8 text-gov-gray font-mono text-xs italic">
                — No records found —
              </td>
            </tr>
          ) : (
            owners.map((owner, idx) => {
              const ownerPay = payMap[owner.id] || {};
              let rowTotal = 0;
              return (
                <tr
                  key={owner.id}
                  onMouseEnter={() => setHoveredRow(owner.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ background: hoveredRow === owner.id ? '#dbeafe' : idx % 2 === 0 ? '#fff' : '#fffbeb' }}
                >
                  <td className="ledger-owner-cell">
                    <div className="font-bold text-gov-navy">{owner.owner_name}</div>
                    <div className="text-gov-blue text-xs font-mono">{owner.stall_number}</div>
                  </td>
                  {Array.from({ length: 12 }, (_, mo) => {
                    const p = ownerPay[mo];
                    if (p) rowTotal += Number(p.total_amount);
                    return p ? (
                      <>
                        <td key={`${owner.id}-${mo}-or`} className="ledger-or-cell">{p.or_number}</td>
                        <td key={`${owner.id}-${mo}-dt`} className="ledger-date-cell">
                          {new Date(p.payment_date).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit' })}
                        </td>
                        <td key={`${owner.id}-${mo}-am`} className="ledger-amount-cell">
                          {Number(p.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    ) : (
                      <>
                        <td key={`${owner.id}-${mo}-or`} className="ledger-empty-cell">·</td>
                        <td key={`${owner.id}-${mo}-dt`} className="ledger-empty-cell">·</td>
                        <td key={`${owner.id}-${mo}-am`} className="ledger-empty-cell">·</td>
                      </>
                    );
                  })}
                  <td style={{
                    fontFamily: 'Courier Prime, monospace', fontWeight: 700, fontSize: '0.72rem',
                    textAlign: 'right', padding: '4px 8px', color: rowTotal > 0 ? '#1a5c2a' : '#8b1a1a',
                    borderColor: '#c8b99a', borderWidth: 1, borderStyle: 'solid', background: '#fef3c7'
                  }}>
                    {rowTotal > 0 ? rowTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {/* Grand total footer */}
        {owners.length > 0 && (
          <tfoot>
            <tr style={{ background: '#1a2744' }}>
              <td style={{ padding: '6px 8px', color: '#c9a84c', fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '0.7rem', borderColor: '#c8b99a', borderWidth: 1, borderStyle: 'solid' }}>
                GRAND TOTAL
              </td>
              {Array.from({ length: 12 }, (_, mo) => {
                const monthTotal = owners.reduce((sum, owner) => {
                  const p = (payMap[owner.id] || {})[mo];
                  return sum + (p ? Number(p.total_amount) : 0);
                }, 0);
                return (
                  <>
                    <td key={`ft-or-${mo}`} style={{ borderColor: '#c8b99a', borderWidth: 1, borderStyle: 'solid' }}></td>
                    <td key={`ft-dt-${mo}`} style={{ borderColor: '#c8b99a', borderWidth: 1, borderStyle: 'solid' }}></td>
                    <td key={`ft-am-${mo}`} style={{
                      fontFamily: 'Courier Prime, monospace', fontWeight: 700, fontSize: '0.7rem',
                      textAlign: 'right', padding: '4px 6px', color: '#c9a84c',
                      borderColor: '#c8b99a', borderWidth: 1, borderStyle: 'solid'
                    }}>
                      {monthTotal > 0 ? monthTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : ''}
                    </td>
                  </>
                );
              })}
              <td style={{
                fontFamily: 'Courier Prime, monospace', fontWeight: 700, fontSize: '0.72rem',
                textAlign: 'right', padding: '4px 8px', color: '#c9a84c',
                borderColor: '#c8b99a', borderWidth: 1, borderStyle: 'solid'
              }}>
                {owners.reduce((sum, owner) => {
                  return sum + Object.values(payMap[owner.id] || {}).reduce((s, p) => s + Number(p.total_amount), 0);
                }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
