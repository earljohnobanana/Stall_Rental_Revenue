import { useState, useEffect } from 'react';
import { MdClose, MdPerson, MdStorefront, MdWarning, MdCheckCircle,
         MdAccessTime, MdShield, MdPayments, MdBolt } from 'react-icons/md';
import api from '../services/api';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

// ── Deadline helpers ──────────────────────────────────────────
function getInterestDeadline(year, month) {
  const d = new Date(year, month - 1, 20);
  const day = d.getDay();
  if (day === 6) return new Date(year, month - 1, 23); // Sat → Tue
  if (day === 0) return new Date(year, month - 1, 22); // Sun → Tue
  return d;
}

function isLatePayment(dateStr) {
  if (!dateStr) return false;
  const d  = new Date(dateStr);
  const dl = getInterestDeadline(d.getFullYear(), d.getMonth() + 1);
  dl.setHours(23, 59, 59, 999);
  return d > dl;
}

function deadlineLabel(dateStr) {
  if (!dateStr) return '';
  const d  = new Date(dateStr);
  const dl = getInterestDeadline(d.getFullYear(), d.getMonth() + 1);
  return dl.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ════════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ════════════════════════════════════════════════════════════════
export default function PaymentModal({ payment, onClose, onSave }) {
  const [owners, setOwners]                 = useState([]);
  const [historyOwners, setHistoryOwners]   = useState([]); // from stall_history
  const [stallForHistory, setStallForHistory] = useState(''); // stall to link past owner payment to
  const [allStalls, setAllStalls]           = useState([]);
  const [ownerSearch, setOwnerSearch]       = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);
  const [selectedOwner, setSelectedOwner]   = useState(null);
  const [balanceInfo, setBalanceInfo]       = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [settleBalances, setSettleBalances] = useState([]);
  const [ownersLoading, setOwnersLoading]   = useState(true);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Payment type: 'security_deposit', 'rental', 'electric'
  const [paymentType, setPaymentType] = useState('rental');

  // Rental form
  const [rentalForm, setRentalForm] = useState({
    or_number:    '',
    payment_date: new Date().toISOString().split('T')[0],
    rental_fee:   '',
    remarks:      '',
  });

  // Electric form
  const [electricForm, setElectricForm] = useState({
    or_number:    '',
    payment_date: new Date().toISOString().split('T')[0],
    electric_due: '',
    electric_fee: '',
    months_covered: '',
    remarks:      '',
  });

  // Security deposit form
  const [secDepForm, setSecDepForm] = useState({
    or_number:        '',
    payment_date:     new Date().toISOString().split('T')[0],
    security_deposit: '',
    remarks:          '',
  });

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [dupWarning, setDupWarning]     = useState(null);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddDone, setQuickAddDone]       = useState(false); // {message, payload} for post-anyway
  const [forceDuplicate, setForceDuplicate] = useState(false);

  // Load owners
  useEffect(() => {
    // Fetch stalls for past owner linking
    api.get('/stalls').then(r => setAllStalls(r.data || [])).catch(() => {});

    // Fetch owners first — always works
    // Then try history separately — fails gracefully if endpoint not ready
    api.get('/owners')
      .then(ownersRes => {
        setOwners(ownersRes.data || []);
        // Try to also fetch stall history owners
        api.get('/stalls/all-history')
          .then(historyRes => {
            const currentOwnerNames = new Set(
              (ownersRes.data || []).map(o => o.full_name?.toLowerCase().trim())
            );
            const histUnique = [];
            // Group by owner name — keep one entry per unique owner
            // but track ALL stalls they were associated with
            const ownerMap = new Map();
            (historyRes.data || []).forEach(h => {
              const key = h.owner_name?.toLowerCase().trim();
              if (!currentOwnerNames.has(key)) {
                if (!ownerMap.has(key)) {
                  ownerMap.set(key, {
                    id: `hist_${h.id}`,
                    full_name: h.owner_name,
                    contact_number: h.contact_number,
                    address: h.address,
                    stall_number: null,
                    stall_id: null,
                    rental_rate: h.rental_rate,
                    security_deposit: h.security_deposit,
                    building_name: null,
                    from_history: true,
                    stall_number_ref: h.stall_number,
                    // Track all stalls for this past owner
                    all_stalls: [{ stall_number: h.stall_number, stall_id: h.stall_id }],
                  });
                } else {
                  // Add additional stall reference
                  const existing = ownerMap.get(key);
                  if (!existing.all_stalls.find(s => s.stall_number === h.stall_number)) {
                    existing.all_stalls.push({ stall_number: h.stall_number, stall_id: h.stall_id });
                    existing.stall_number_ref = existing.all_stalls.map(s => s.stall_number).join(', ');
                  }
                }
              }
            });
            ownerMap.forEach(o => histUnique.push(o));
            setHistoryOwners(histUnique);
          })
          .catch(() => {
            // History endpoint not available yet — just use owners list
            setHistoryOwners([]);
          });
      })
      .catch(() => setOwners([]))
      .finally(() => setOwnersLoading(false));
  }, []);

  // Handle edit mode
  useEffect(() => {
    if (payment) {
      const type = payment.payment_type || 'rental';
      setPaymentType(type);
      if (type === 'electric') {
        setElectricForm({
          or_number:      payment.or_number    || '',
          payment_date:   payment.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          electric_due:   payment.electric_fee || '',
          electric_fee:   payment.electric_fee || '',
          months_covered: '',
          remarks:        payment.remarks      || '',
        });
      } else if (type === 'security_deposit') {
        setSecDepForm({
          or_number:        payment.or_number    || '',
          payment_date:     payment.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          security_deposit: payment.total_amount || '',
          remarks:          payment.remarks      || '',
        });
      } else {
        setRentalForm({
          or_number:    payment.or_number    || '',
          payment_date: payment.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          rental_fee:   payment.rental_fee   || '',
          remarks:      payment.remarks      || '',
        });
      }
    }
  }, [payment]);

  // Restore owner on edit
  useEffect(() => {
    if (payment?.owner_id && owners.length > 0) {
      const found = owners.find(o => String(o.id) === String(payment.owner_id));
      if (found) { setSelectedOwner(found); setOwnerSearch(found.full_name); }
    }
  }, [payment, owners]);

  // Load owner balance and history
  const loadOwnerData = async (ownerId, date) => {
    if (!ownerId) { setBalanceInfo(null); setPaymentHistory([]); return; }
    setBalanceLoading(true);
    try {
      const useDate = date || rentalForm.payment_date;

      // Fetch payment history first (always works)
      const payRes = await api.get(`/payments?owner_id=${ownerId}`);
      setPaymentHistory(payRes.data || []);

      // Fetch balance — may fail if owner has no stall (past owner)
      try {
        const balRes = await api.get(`/balances/owner/${ownerId}?payment_date=${useDate}`);
        setBalanceInfo(balRes.data);
        // Auto-fill security deposit from stall if available
        if (!payment && balRes.data?.owner?.security_deposit) {
          setSecDepForm(f => ({ ...f, security_deposit: String(balRes.data.owner.security_deposit) }));
        }
      } catch {
        // Past owner with no stall — no balance info, that's okay
        setBalanceInfo(null);
      }
    } catch {
      setBalanceInfo(null);
      setPaymentHistory([]);
    } finally { setBalanceLoading(false); }
  };

  const allOwners = [...owners, ...historyOwners];
  const filteredOwners = ownerSearch.length >= 1
    ? allOwners.filter(o => {
        const name     = (o.full_name        || '').toLowerCase();
        const stall    = (o.stall_number     || '').toLowerCase();
        const stallRef = (o.stall_number_ref || '').toLowerCase(); // past owner stall ref
        const query    = ownerSearch.toLowerCase();
        return name.includes(query) || stall.includes(query) || stallRef.includes(query);
      }).sort((a, b) => {
        // Current owners first, past owners after
        const aActive = a.stall_number && !a.from_history ? 0 : 1;
        const bActive = b.stall_number && !b.from_history ? 0 : 1;
        return aActive - bActive;
      }).slice(0, 20)
    : [];

  const selectOwner = (owner) => {
    setSelectedOwner(owner);
    setOwnerSearch(owner.full_name);
    setShowDropdown(false);
    setSettleBalances([]);
    // Only load balance data for real stall_owners (not history-only entries)
    if (!owner.from_history) {
      loadOwnerData(owner.id);
    } else {
      setBalanceInfo(null);
      setPaymentHistory([]);
    }
  };

  const clearOwner = () => {
    setSelectedOwner(null); setOwnerSearch('');
    setBalanceInfo(null); setSettleBalances([]);
    setPaymentHistory([]);
  };

  // Payment history analysis
  const monthlyPayments  = paymentHistory.filter(p => p.payment_type === 'rental' || p.payment_type === 'monthly' || (!p.payment_type && p.rental_fee > 0));
  const hasSecDep        = paymentHistory.some(p => p.payment_type === 'security_deposit');
  const isFirstRental    = monthlyPayments.length === 0 && !payment;

  // Rental interest calculation
  const rentalAmt   = parseFloat(rentalForm.rental_fee)   || 0;
  const electricDue = parseFloat(electricForm.electric_due)|| 0;
  const electricAmt = parseFloat(electricForm.electric_fee)|| 0;
  const electricShort = Math.max(0, electricDue - electricAmt);

  const isLate       = !isFirstRental && isLatePayment(rentalForm.payment_date) && paymentType === 'rental';
  const lateInterest = isLate ? +(rentalAmt * 0.25).toFixed(2) : 0;
  const rentalTotal  = rentalAmt + lateInterest;

  const toggleBalance = (bid) =>
    setSettleBalances(prev => prev.includes(bid) ? prev.filter(id => id !== bid) : [...prev, bid]);

  const handleRental   = (e) => setRentalForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleElectric = (e) => setElectricForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSecDep   = (e) => setSecDepForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Reload balance when rental payment date changes
  useEffect(() => {
    if (selectedOwner && paymentType === 'rental') {
      loadOwnerData(selectedOwner.id, rentalForm.payment_date);
    }
  }, [rentalForm.payment_date]);

  const submit = async (e) => {
    e.preventDefault(); setError('');

    if (!selectedOwner) return setError('Please select a stall owner.');

    // Block history-only owners — they have fake IDs like 'hist_123' not real owner_ids
    if (selectedOwner.from_history || String(selectedOwner.id).startsWith('hist_')) {
      setError('HIST_OWNER'); // special flag — renders quick-add UI below
      return;
    }

    let orNum, payDate;
    if (paymentType === 'rental')           { orNum = rentalForm.or_number;   payDate = rentalForm.payment_date; }
    else if (paymentType === 'electric')    { orNum = electricForm.or_number; payDate = electricForm.payment_date; }
    else                                    { orNum = secDepForm.or_number;   payDate = secDepForm.payment_date; }

    if (!orNum?.trim())  return setError('OR Number is required.');
    // Past owner must select a stall
    if ((!selectedOwner.stall_number || selectedOwner.from_history) && !stallForHistory) {
      return setError('Please select which stall this payment belongs to.');
    }
    if (!payDate)        return setError('Payment date is required.');

    if (paymentType === 'rental' && !rentalAmt) return setError('Please enter the rental fee amount.');
    if (paymentType === 'electric' && !electricAmt) return setError('Please enter the electric fee amount paid.');
    if (paymentType === 'security_deposit' && !parseFloat(secDepForm.security_deposit)) return setError('Please enter the security deposit amount.');

    setLoading(true);
    try {
      let payload = {
        owner_id:    selectedOwner.id,
        or_number:   orNum.trim(),
        payment_date: payDate,
        payment_type: paymentType,
        settle_balance_ids: settleBalances,
        force_duplicate: forceDuplicate,
        // For past owners — link payment to specific stall
        stall_id_override: (!selectedOwner.stall_number || selectedOwner.from_history) ? stallForHistory : null,
      };

      if (paymentType === 'security_deposit') {
        const secAmt = parseFloat(secDepForm.security_deposit) || 0;
        payload = { ...payload,
          rental_fee:   0,
          electric_fee: 0,
          total_amount: secAmt,
          remarks: secDepForm.remarks || 'Security Deposit (non-refundable)',
        };
      } else if (paymentType === 'electric') {
        payload = { ...payload,
          rental_fee:     0,
          electric_fee:   electricAmt,
          electric_due:   electricDue,
          total_amount:   electricAmt,
          months_covered: electricForm.months_covered,
          remarks: electricForm.remarks || (electricForm.months_covered ? `Electric fee — ${electricForm.months_covered}` : 'Electric fee payment'),
        };
      } else {
        // Rental payment
        const balancePenalty = settleBalances.reduce((sum, bid) => {
          const b = balanceInfo?.balance_details?.find(d => d.id === bid);
          return sum + (b ? parseFloat(b.total_due) : 0);
        }, 0);
        payload = { ...payload,
          rental_fee:       rentalAmt,
          electric_fee:     0,
          total_amount:     rentalTotal + balancePenalty,
          is_first_monthly: isFirstRental,
          is_late:          isLate,
          late_interest:    lateInterest,
          remarks: rentalForm.remarks || (isLate ? `Late payment — 25% interest: ₱${fmt(lateInterest)}` : null),
        };
      }

      if (payment?.id) await api.put(`/payments/${payment.id}`, payload);
      else             await api.post('/payments', payload);
      onSave();
    } catch (err) {
      const data = err.response?.data;
      if (data?.duplicate && !data?.same_owner) {
        // Different owner duplicate — show "Post Anyway" option
        setDupWarning({ message: data.message, payload });
        setLoading(false);
        return;
      }
      setError(data?.message || 'Error saving payment.');
    } finally { setLoading(false); }
  };

  const hasBalance = balanceInfo?.has_balance;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="gov-card w-full max-w-lg rounded-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gov-navy flex-shrink-0">
          <h2 className="font-serif text-white font-bold">Record Payment</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white"><MdClose size={22}/></button>
        </div>
        <div className="bg-gov-cream border-b border-gov-border py-2.5 text-center flex-shrink-0">
          <p className="font-serif text-gov-navy font-bold text-sm">OFFICIAL RECEIPT</p>
          <p className="font-mono text-gov-gray text-xs">Municipal Treasurer's Office</p>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={submit} className="p-5 space-y-4">

            {error === 'HIST_OWNER' ? (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 space-y-3">
                <p className="text-amber-800 font-serif font-bold text-sm">⚠ Past Owner — Not Yet in System</p>
                <p className="text-amber-700 font-mono text-xs">
                  <strong>{selectedOwner?.full_name}</strong> is only in the stall history records.
                  Click the button below to add them as a Stall Owner so payments can be recorded.
                </p>
                {quickAddDone ? (
                  <div className="bg-green-50 border border-green-300 rounded p-2.5">
                    <p className="text-green-700 font-mono text-xs font-bold">
                      ✓ {selectedOwner?.full_name} added! Search their name again to select them.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={quickAddLoading}
                    onClick={async () => {
                      setQuickAddLoading(true);
                      try {
                        await api.post('/owners', {
                          full_name:        selectedOwner.full_name,
                          contact_number:   selectedOwner.contact_number || '',
                          address:          selectedOwner.address || '',
                          stall_id:         null,
                          rental_rate:      selectedOwner.rental_rate || 0,
                          security_deposit: selectedOwner.security_deposit || 0,
                          status:           'occupied',
                          date_started:     null,
                        });
                        setQuickAddDone(true);
                        // Reload owners list
                        const res = await api.get('/owners');
                        setOwners(res.data || []);
                        // Auto-select the new owner
                        const found = (res.data || []).find(o =>
                          o.full_name?.toLowerCase().trim() === selectedOwner.full_name?.toLowerCase().trim()
                        );
                        if (found) {
                          setSelectedOwner(found);
                          setOwnerSearch(found.full_name);
                          setError('');
                          loadOwnerData(found.id);
                        }
                      } catch (err) {
                        setError(err.response?.data?.message || 'Failed to add owner. Please try manually.');
                      } finally {
                        setQuickAddLoading(false);
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-gov-navy text-white font-serif font-bold text-sm rounded-lg hover:bg-gov-navy/80 transition-colors flex items-center justify-center gap-2">
                    {quickAddLoading
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Adding to system...</>
                      : <>+ Add "{selectedOwner?.full_name}" as Stall Owner (No Stall)</>}
                  </button>
                )}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-300 rounded p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            ) : null}

            {/* Owner search */}
            <div>
              <label className="gov-label flex items-center gap-1">
                <MdPerson className="text-gov-blue"/> Stall Owner *
              </label>
              {ownersLoading ? (
                <div className="gov-input text-gov-gray italic text-sm">Loading owners...</div>
              ) : (
                <div className="relative">
                  <input type="text" value={ownerSearch}
                    onChange={e => {
                      setOwnerSearch(e.target.value);
                      setShowDropdown(true);
                      if (!e.target.value) clearOwner();
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 300)}
                    placeholder="Type to search owner or stall number..."
                    className="gov-input pr-8" autoComplete="off"/>
                  {ownerSearch && (
                    <button type="button" onClick={clearOwner}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gov-gray hover:text-gov-red text-lg">×</button>
                  )}
                  {showDropdown && ownerSearch.length >= 1 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gov-border rounded shadow-lg max-h-48 overflow-y-auto">
                      {filteredOwners.length === 0 && (
                        <div className="px-3 py-3 text-center">
                          <p className="text-gov-gray font-mono text-xs">No owner found for "{ownerSearch}"</p>
                          <p className="text-gov-gray font-mono text-xs mt-1">Make sure the name is in the system.</p>
                        </div>
                      )}
                      {filteredOwners.map(o => (
                        <button key={o.id} type="button" onMouseDown={() => {
                            selectOwner(o);
                            // Auto-select stall for past owners with one stall
                            if (o.from_history && o.all_stalls?.length === 1) {
                              setStallForHistory(String(o.all_stalls[0].stall_id));
                            }
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-gov-cream border-b border-gov-border/50 last:border-0 ${o.from_history ? 'bg-amber-50/50' : 'bg-white'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-sans text-sm font-semibold text-gov-navy">{o.full_name}</p>
                            {o.from_history
                              ? <span className="text-xs font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">Past Owner</span>
                              : <span className="text-xs font-mono text-green-700 bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">Current</span>}
                          </div>
                          {o.from_history
                            ? <p className="font-mono text-xs text-amber-600 mt-0.5">
                                📋 Previously: {o.stall_number_ref || 'Unknown stall'}
                              </p>
                            : <p className="font-mono text-xs text-gov-blue mt-0.5">
                                {o.stall_number} · {o.building_name}
                              </p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedOwner && (
                <div className="mt-1.5 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 flex-wrap">
                  <MdStorefront className="text-gov-blue text-sm flex-shrink-0"/>
                  {selectedOwner.from_history
                    ? <>
                        <span className="bg-amber-100 text-amber-700 font-mono text-xs px-1.5 py-0.5 rounded font-bold">Past Owner</span>
                        <span className="text-xs text-amber-600 font-mono">
                          Previously: {selectedOwner.stall_number_ref || 'Unknown stall'}
                        </span>
                      </>
                    : <>
                        <span className="font-mono text-xs text-gov-blue font-bold">{selectedOwner.stall_number}</span>
                        {selectedOwner.building_name && <span className="text-xs text-gov-gray">· {selectedOwner.building_name}</span>}
                        <span className="text-xs text-gov-gray ml-auto font-mono">Monthly: ₱{fmt(selectedOwner.rental_rate)}</span>
                      </>}
                  {hasSecDep && <span className="bg-gov-gold/20 text-gov-navy font-mono text-xs px-1.5 py-0.5 rounded w-full">✓ Security deposit paid</span>}
                </div>
              )}
            </div>

            {/* Payment Type Selector — 3 options */}
            {selectedOwner && (
              <div>
                <label className="gov-label">Payment Type *</label>
                <div className="grid grid-cols-3 gap-2">

                  {/* Security Deposit */}
                  <button type="button" onClick={() => setPaymentType('security_deposit')}
                    disabled={hasSecDep}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      paymentType === 'security_deposit' ? 'border-gov-gold bg-gov-gold/10'
                      : hasSecDep ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gov-border hover:border-gov-gold/50 bg-white'}`}>
                    <MdShield className={`text-2xl ${paymentType === 'security_deposit' ? 'text-gov-gold' : 'text-gov-gray'}`}/>
                    <p className="font-serif font-bold text-gov-navy text-xs text-center leading-tight">Security Deposit</p>
                    <p className="font-mono text-xs text-gov-gray">{hasSecDep ? '✓ Paid' : '1x only'}</p>
                  </button>

                  {/* Rental */}
                  <button type="button" onClick={() => setPaymentType('rental')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      paymentType === 'rental' ? 'border-gov-blue bg-blue-50' : 'border-gov-border hover:border-gov-blue/50 bg-white'}`}>
                    <MdPayments className={`text-2xl ${paymentType === 'rental' ? 'text-gov-blue' : 'text-gov-gray'}`}/>
                    <p className="font-serif font-bold text-gov-navy text-xs text-center leading-tight">Rental Fee</p>
                    <p className="font-mono text-xs text-gov-gray">
                      {isFirstRental ? 'No interest' : '₱' + fmt(selectedOwner?.rental_rate)}
                    </p>
                  </button>

                  {/* Electric */}
                  <button type="button" onClick={() => setPaymentType('electric')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                      paymentType === 'electric' ? 'border-amber-400 bg-amber-50' : 'border-gov-border hover:border-amber-300 bg-white'}`}>
                    <MdBolt className={`text-2xl ${paymentType === 'electric' ? 'text-amber-500' : 'text-gov-gray'}`}/>
                    <p className="font-serif font-bold text-gov-navy text-xs text-center leading-tight">Electric Fee</p>
                    <p className="font-mono text-xs text-green-600">No interest</p>
                  </button>

                </div>

                {/* Past owner notice */}
                {(!selectedOwner.stall_number || selectedOwner.from_history) && (
                  <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-500 text-lg flex-shrink-0">⟳</span>
                      <div>
                        <p className="text-amber-800 font-serif font-bold text-xs">Recording Historical Payment</p>
                        <p className="text-amber-700 font-mono text-xs mt-0.5">
                          Select the stall this payment belongs to so it appears in that stall's history.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="gov-label text-xs">Link to Stall *</label>
                      <select value={stallForHistory}
                        onChange={e => setStallForHistory(e.target.value)}
                        className="gov-input text-xs font-mono">
                        <option value="">— Select stall —</option>
                        {/* Show past owner's known stalls first */}
                        {selectedOwner?.all_stalls?.length > 0 && (
                          <optgroup label={`📋 ${selectedOwner.full_name}'s Previous Stalls`}>
                            {selectedOwner.all_stalls.map(s => (
                              <option key={`hist_${s.stall_id}`} value={s.stall_id}>
                                ⭐ {s.stall_number} (previously occupied)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All Stalls">
                          {allStalls.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.stall_number} · {s.building_name} ({s.status})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {stallForHistory && (
                        <p className="text-green-600 text-xs font-mono mt-1">
                          ✓ Payment will be linked to this stall's history
                        </p>
                      )}
                      {!stallForHistory && (
                        <p className="text-amber-600 text-xs font-mono mt-1">
                          Required — links this payment to the stall's complete history
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Banners */}
                {paymentType === 'rental' && isFirstRental && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded p-2.5 flex items-start gap-2">
                    <MdCheckCircle className="text-green-600 flex-shrink-0 mt-0.5"/>
                    <p className="text-green-700 font-mono text-xs">
                      <strong>First rental payment</strong> — no interest applies even if paid late.
                    </p>
                  </div>
                )}
                {paymentType === 'electric' && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2.5 flex items-start gap-2">
                    <MdBolt className="text-amber-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-amber-700 font-mono text-xs">
                      Electric fee has <strong>no interest</strong> — owners can accumulate and pay multiple months at once.
                      Use a separate OR number from rental.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── SECURITY DEPOSIT FORM ── */}
            {paymentType === 'security_deposit' && selectedOwner && (
              <>
                <div><label className="gov-label">OR Number *</label>
                  <input name="or_number" value={secDepForm.or_number} onChange={handleSecDep}
                    required className="gov-input font-mono" placeholder="e.g. 2026-00123"/></div>
                <div><label className="gov-label">Payment Date *</label>
                  <input type="date" name="payment_date" value={secDepForm.payment_date}
                    onChange={handleSecDep} required className="gov-input"/></div>
                <div className="bg-gov-gold/10 border border-gov-gold rounded-lg p-3">
                  <label className="gov-label flex items-center gap-1"><MdShield className="text-gov-gold"/>Security Deposit Amount (₱)</label>
                  <input type="number" step="0.01" min="0" name="security_deposit"
                    value={secDepForm.security_deposit} onChange={handleSecDep}
                    className="gov-input font-mono" placeholder="0.00"/>
                  <p className="text-gov-gray text-xs mt-1 font-mono">Stall rate: ₱{fmt(selectedOwner?.security_deposit)} · Non-refundable</p>
                </div>
                <div><label className="gov-label">Remarks <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                  <input name="remarks" value={secDepForm.remarks} onChange={handleSecDep}
                    className="gov-input" placeholder="Security deposit — non-refundable"/></div>
                <div className="bg-gov-cream border border-gov-border rounded p-3 flex justify-between">
                  <span className="font-serif font-bold text-gov-navy">TOTAL:</span>
                  <span className="font-mono font-bold text-green-700 text-base">₱{fmt(secDepForm.security_deposit)}</span>
                </div>
              </>
            )}

            {/* ── RENTAL FORM ── */}
            {paymentType === 'rental' && selectedOwner && (
              <>
                {/* Balance panel */}
                {balanceLoading && <div className="bg-gray-50 border border-gov-border rounded p-3 text-center"><p className="text-gov-gray text-xs font-mono">Checking balance...</p></div>}

                {!balanceLoading && !isFirstRental && hasBalance && (
                  <div className="bg-red-50 border border-red-300 rounded-lg overflow-hidden">
                    <div className="bg-red-700 px-4 py-2.5 flex items-center gap-2">
                      <MdWarning className="text-white flex-shrink-0"/>
                      <div>
                        <p className="text-white font-serif font-bold text-sm">Outstanding Balance</p>
                        <p className="text-red-200 font-mono text-xs">Total due: ₱{fmt(balanceInfo.total_due)} · 25% simple interest from 20th</p>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-red-700 text-xs font-semibold uppercase tracking-wide">Select to settle:</p>
                      {balanceInfo.balance_details.map(b => (
                        <label key={b.id} className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors ${settleBalances.includes(b.id) ? 'bg-red-100 border-red-400' : 'bg-white border-red-200 hover:border-red-300'}`}>
                          <input type="checkbox" checked={settleBalances.includes(b.id)} onChange={() => toggleBalance(b.id)} className="mt-0.5 flex-shrink-0"/>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <p className="font-serif font-bold text-red-800 text-sm">{b.month_name}</p>
                              <p className="font-mono text-red-700 font-bold">₱{fmt(b.total_due)}</p>
                            </div>
                            <div className="text-xs font-mono mt-1 space-y-0.5">
                              <div className="flex justify-between"><span className="text-red-500">Rental balance:</span><span className="text-red-700">₱{fmt(b.rental_balance)}</span></div>
                              {b.interest_started && <div className="flex justify-between"><span className="text-red-500">Interest ({b.interest_periods}mo × 25%):</span><span className="text-red-600 font-bold">+₱{fmt(b.rental_interest)}</span></div>}
                              {Number(b.electric_balance) > 0 && <div className="flex justify-between"><span className="text-amber-600">Electric balance:</span><span className="text-amber-700">₱{fmt(b.electric_balance)}</span></div>}
                              {!b.interest_started && <div className="text-amber-600">Deadline: {b.first_deadline}</div>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {!balanceLoading && selectedOwner && !hasBalance && !isFirstRental && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2">
                    <MdCheckCircle className="text-green-600 flex-shrink-0"/>
                    <p className="text-green-700 text-xs font-mono">No outstanding rental balance.</p>
                  </div>
                )}

                {/* Late warning */}
                {isLate && (
                  <div className="bg-red-700 rounded-lg p-3 flex items-start gap-2">
                    <MdWarning className="text-white text-xl flex-shrink-0"/>
                    <div>
                      <p className="text-white font-serif font-bold text-sm">Late Payment — 25% Interest Applied</p>
                      <p className="text-red-200 font-mono text-xs mt-0.5">Deadline was {deadlineLabel(rentalForm.payment_date)}.</p>
                    </div>
                  </div>
                )}
                {!isLate && !isFirstRental && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                    <MdAccessTime className="text-gov-blue flex-shrink-0 text-sm"/>
                    <p className="text-gov-blue text-xs font-mono">Deadline: <strong>{deadlineLabel(rentalForm.payment_date)}</strong></p>
                  </div>
                )}

                <div><label className="gov-label">OR Number *</label>
                  <input name="or_number" value={rentalForm.or_number} onChange={handleRental}
                    required className="gov-input font-mono" placeholder="e.g. 2026-00123"/></div>
                <div><label className="gov-label">Payment Date *</label>
                  <input type="date" name="payment_date" value={rentalForm.payment_date}
                    onChange={handleRental} required className="gov-input"/></div>

                {/* Rental amount */}
                <div className={`border rounded-lg p-3 ${isLate ? 'bg-red-50 border-red-300' : 'bg-gov-cream border-gov-border'}`}>
                  <p className="font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide mb-2">
                    Rental Amount (₱)
                    {selectedOwner?.rental_rate > 0 && <span className="text-gov-gray font-normal normal-case ml-2">Monthly: ₱{fmt(selectedOwner.rental_rate)}</span>}
                  </p>
                  <input type="number" step="0.01" min="0" name="rental_fee"
                    value={rentalForm.rental_fee} onChange={handleRental}
                    className="gov-input font-mono" placeholder="0.00"/>
                  {isLate && rentalAmt > 0 && (
                    <div className="mt-2 bg-red-100 border border-red-300 rounded p-2 text-xs font-mono space-y-1">
                      <div className="flex justify-between"><span className="text-red-600">Rental:</span><span className="text-red-700 font-bold">₱{fmt(rentalAmt)}</span></div>
                      <div className="flex justify-between"><span className="text-red-600">Late interest (25%):</span><span className="text-red-700 font-bold">+₱{fmt(lateInterest)}</span></div>
                      <div className="flex justify-between border-t border-red-300 pt-1"><span className="text-red-800 font-bold">Total:</span><span className="text-red-800 font-bold">₱{fmt(rentalTotal)}</span></div>
                    </div>
                  )}
                </div>

                <div><label className="gov-label">Remarks <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                  <input name="remarks" value={rentalForm.remarks} onChange={handleRental}
                    className="gov-input" placeholder={isLate ? 'Late payment — interest included' : isFirstRental ? 'First rental payment' : 'Optional notes...'}/></div>

                {/* Total */}
                <div className="bg-gov-cream border border-gov-border rounded p-3 space-y-1">
                  {rentalAmt > 0 && <div className="flex justify-between text-xs font-mono"><span className="text-gov-gray">Rental:</span><span>₱{fmt(rentalAmt)}</span></div>}
                  {lateInterest > 0 && <div className="flex justify-between text-xs font-mono"><span className="text-red-600">Late interest:</span><span className="text-red-700">+₱{fmt(lateInterest)}</span></div>}
                  {settleBalances.length > 0 && (
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-red-600">Balance settlement:</span>
                      <span className="text-red-700">+₱{fmt(settleBalances.reduce((sum, bid) => {
                        const b = balanceInfo?.balance_details?.find(d => d.id === bid);
                        return sum + (b ? parseFloat(b.total_due) : 0);
                      }, 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-mono font-bold border-t border-gov-border pt-1">
                    <span className="text-gov-navy">TOTAL:</span>
                    <span className="text-green-700 text-base">₱{fmt(rentalTotal + settleBalances.reduce((sum, bid) => {
                      const b = balanceInfo?.balance_details?.find(d => d.id === bid);
                      return sum + (b ? parseFloat(b.total_due) : 0);
                    }, 0))}</span>
                  </div>
                </div>
              </>
            )}

            {/* ── ELECTRIC FORM ── */}
            {paymentType === 'electric' && selectedOwner && (
              <>
                <div><label className="gov-label">OR Number *</label>
                  <input name="or_number" value={electricForm.or_number} onChange={handleElectric}
                    required className="gov-input font-mono" placeholder="e.g. 2026-00456"/></div>
                <div><label className="gov-label">Payment Date *</label>
                  <input type="date" name="payment_date" value={electricForm.payment_date}
                    onChange={handleElectric} required className="gov-input"/></div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                  <p className="font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide flex items-center gap-1">
                    <MdBolt className="text-amber-500"/> Electric Fee
                    <span className="bg-green-100 text-green-700 font-mono font-normal normal-case text-xs px-1.5 py-0.5 rounded ml-1">No interest</span>
                  </p>

                  {/* Months covered — optional field */}
                  <div>
                    <label className="gov-label">Months Covered <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                    <input name="months_covered" value={electricForm.months_covered} onChange={handleElectric}
                      className="gov-input font-mono" placeholder="e.g. January–March 2026 or March 2026"/>
                    <p className="text-amber-700 text-xs font-mono mt-1">Fill this if paying for multiple accumulated months</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="gov-label">Total Amount Due (₱)</label>
                      <input type="number" step="0.01" min="0" name="electric_due"
                        value={electricForm.electric_due} onChange={handleElectric}
                        className="gov-input font-mono" placeholder="Based on meter"/>
                    </div>
                    <div>
                      <label className="gov-label">Amount Paid (₱)</label>
                      <input type="number" step="0.01" min="0" name="electric_fee"
                        value={electricForm.electric_fee} onChange={handleElectric}
                        className="gov-input font-mono" placeholder="0.00"/>
                    </div>
                  </div>

                  {electricShort > 0 && (
                    <div className="flex items-center gap-2 bg-white border border-amber-300 rounded px-2.5 py-2">
                      <MdWarning className="text-amber-500 flex-shrink-0 text-sm"/>
                      <p className="text-amber-700 text-xs font-mono">
                        Short by ₱{fmt(electricShort)} → carried forward <strong>without interest</strong>
                      </p>
                    </div>
                  )}
                  {electricAmt > 0 && electricDue > 0 && electricShort === 0 && (
                    <p className="text-green-600 text-xs font-mono flex items-center gap-1">
                      <MdCheckCircle size={12}/> Electric fully paid
                    </p>
                  )}
                </div>

                <div><label className="gov-label">Remarks <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                  <input name="remarks" value={electricForm.remarks} onChange={handleElectric}
                    className="gov-input" placeholder="e.g. Electric payment for Jan–Mar 2026"/></div>

                <div className="bg-gov-cream border border-gov-border rounded p-3 flex justify-between items-center">
                  <span className="font-serif font-bold text-gov-navy">TOTAL:</span>
                  <span className="font-mono font-bold text-green-700 text-base">₱{fmt(electricAmt)}</span>
                </div>
              </>
            )}

            {/* Duplicate OR warning — Post Anyway option */}
            {dupWarning && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 space-y-3">
                <p className="text-amber-800 font-serif font-bold text-sm">⚠ Duplicate OR Number</p>
                <p className="text-amber-700 font-mono text-xs">{dupWarning.message}</p>
                <p className="text-amber-600 font-mono text-xs">
                  This is allowed for backdated entries (e.g. previous owner's old payments).
                  Make sure the OR number and date are correct before proceeding.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setDupWarning(null); setForceDuplicate(false); }}
                    className="gov-btn-secondary text-xs">Cancel</button>
                  <button type="button" onClick={async () => {
                    setForceDuplicate(true);
                    setDupWarning(null);
                    setLoading(true);
                    try {
                      const payload = { ...dupWarning.payload, force_duplicate: true };
                      if (payment?.id) await api.put(`/payments/${payment.id}`, payload);
                      else             await api.post('/payments', payload);
                      onSave();
                    } catch (err) {
                      setError(err.response?.data?.message || 'Error saving payment.');
                    } finally { setLoading(false); }
                  }} className="gov-btn-primary text-xs bg-amber-600 hover:bg-amber-700 border-amber-600">
                    Post Anyway (Backdated Entry)
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="gov-btn-secondary">Cancel</button>
              <button type="submit" disabled={loading}
                className={`min-w-[140px] ${isLate && paymentType === 'rental' ? 'gov-btn-danger' : 'gov-btn-primary'}`}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</span>
                  : paymentType === 'security_deposit' ? 'Post Security Deposit'
                  : paymentType === 'electric'         ? 'Post Electric Payment'
                  : isFirstRental                      ? 'Post 1st Rental'
                  : isLate                             ? '⚠ Post Late Rental'
                  : 'Post Rental Payment'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}