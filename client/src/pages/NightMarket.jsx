import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdVisibility, MdClose,
         MdWarning, MdCheckCircle, MdNightlight, MdPayments, MdPerson, MdBolt } from 'react-icons/md';
import api from '../services/api';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

// ════════════════════════════════════════════════════════════════════════════
// STALL FORM MODAL
// ════════════════════════════════════════════════════════════════════════════
function StallFormModal({ stall, onClose, onSave }) {
  const [form, setForm] = useState({
    stall_number: '', owner_name: '', contact_number: '', address: '',
    daily_rate: '', has_interest: false, interest_rate: 25,
    status: 'occupied', date_started: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (stall) setForm({
      stall_number:   stall.stall_number   || '',
      owner_name:     stall.owner_name     || '',
      contact_number: stall.contact_number || '',
      address:        stall.address        || '',
      daily_rate:     stall.rental_rate    || '',
      has_interest:   !!stall.has_interest,
      interest_rate:  stall.interest_rate  || 25,
      status:         stall.status         || 'occupied',
      date_started:   stall.date_started?.split('T')[0] || '',
    });
  }, [stall]);

  const handle = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [e.target.name]: val }));
  };

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form, rental_rate: form.daily_rate, security_deposit: 0 };
      if (stall?.id) await api.put(`/night-market/stalls/${stall.id}`, payload);
      else           await api.post('/night-market/stalls', payload);
      onSave();
    } catch (err) { setError(err.response?.data?.message || 'Error saving.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="gov-card w-full max-w-lg rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 bg-gov-navy flex-shrink-0">
          <h2 className="font-serif text-white font-bold">{stall ? 'Edit Night Market Stall' : 'Add Night Market Stall'}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white"><MdClose size={22}/></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={submit} className="p-5 space-y-5">
            {error && <div className="bg-red-50 border border-red-300 rounded p-3"><p className="text-red-700 text-sm">{error}</p></div>}

            {/* Stall Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdNightlight className="text-gov-gold text-lg"/>
                <h3 className="font-serif font-bold text-gov-navy text-sm uppercase tracking-wide">Stall Information</h3>
                <div className="flex-1 h-px bg-gov-border"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="gov-label">Stall Number *</label>
                  <input name="stall_number" value={form.stall_number} onChange={handle} required className="gov-input font-mono" placeholder="e.g. NM-001"/>
                </div>
                <div>
                  <label className="gov-label">Status</label>
                  <select name="status" value={form.status} onChange={handle} className="gov-input">
                    <option value="occupied">Occupied</option>
                    <option value="vacant">Vacant</option>
                    <option value="delinquent">Delinquent</option>
                  </select>
                </div>
                <div>
                  <label className="gov-label">Daily Rate (₱) *</label>
                  <input type="number" step="0.01" min="0" name="daily_rate" value={form.daily_rate} onChange={handle} required className="gov-input font-mono" placeholder="0.00"/>
                </div>
                <div>
                  <label className="gov-label">Date Started</label>
                  <input type="date" name="date_started" value={form.date_started} onChange={handle} className="gov-input"/>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdPerson className="text-gov-blue text-lg"/>
                <h3 className="font-serif font-bold text-gov-navy text-sm uppercase tracking-wide">Owner Information</h3>
                <div className="flex-1 h-px bg-gov-border"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="gov-label">Owner Full Name *</label>
                  <input name="owner_name" value={form.owner_name} onChange={handle} required className="gov-input" placeholder="Enter owner's full name"/>
                </div>
                <div>
                  <label className="gov-label">Contact Number</label>
                  <input name="contact_number" value={form.contact_number} onChange={handle} className="gov-input font-mono" placeholder="e.g. 09171234567"/>
                </div>
                <div>
                  <label className="gov-label">Address</label>
                  <input name="address" value={form.address} onChange={handle} className="gov-input" placeholder="e.g. Sta. Catalina"/>
                </div>
              </div>
            </div>

            {/* Interest Toggle */}
            <div className={`rounded-lg border p-4 ${form.has_interest ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gov-border'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="has_interest" checked={form.has_interest} onChange={handle} className="w-4 h-4"/>
                <div>
                  <p className="font-serif font-bold text-gov-navy text-sm">Enable Interest on Unpaid Balance</p>
                  <p className="text-gov-gray font-mono text-xs mt-0.5">When enabled, unpaid balance accrues interest</p>
                </div>
              </label>
              {form.has_interest && (
                <div className="mt-3 pl-7">
                  <label className="gov-label">Interest Rate (%)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" min="0" max="100" name="interest_rate" value={form.interest_rate} onChange={handle} className="gov-input font-mono w-28"/>
                    <span className="text-gov-gray text-sm font-mono">%</span>
                  </div>
                  <p className="text-amber-700 text-xs font-mono mt-1">Ex: Balance ₱500 × {form.interest_rate}% = ₱{fmt(500 * form.interest_rate / 100)} interest</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="gov-btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="gov-btn-primary min-w-[120px]">
                {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</span> : 'Save Stall'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT MODAL — Separate Daily Rental / Electric / Balance
// ════════════════════════════════════════════════════════════════════════════
function PaymentModal({ stall, onClose, onSave }) {
  const [paymentType, setPaymentType] = useState('daily');

  // Daily rental form
  const [dailyForm, setDailyForm] = useState({
    or_number:    '',
    payment_date: new Date().toISOString().split('T')[0],
    rental_fee:   stall?.rental_rate || '',
    balance:      '',
    apply_interest: false,
    remarks:      '',
  });

  // Electric form
  const [electricForm, setElectricForm] = useState({
    or_number:      '',
    payment_date:   new Date().toISOString().split('T')[0],
    electric_due:   '',
    electric_fee:   '',
    months_covered: '',
    remarks:        '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleDaily   = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDailyForm(f => ({ ...f, [e.target.name]: val }));
  };
  const handleElectric = (e) => setElectricForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Daily calculations
  const dailyAmt    = parseFloat(dailyForm.rental_fee) || 0;
  const balanceAmt  = parseFloat(dailyForm.balance)    || 0;
  const balInterest = stall?.has_interest && dailyForm.apply_interest
    ? +(balanceAmt * (stall.interest_rate / 100)).toFixed(2) : 0;
  const dailyTotal  = dailyAmt + balanceAmt + balInterest;

  // Electric calculations
  const electricDue   = parseFloat(electricForm.electric_due) || 0;
  const electricAmt   = parseFloat(electricForm.electric_fee) || 0;
  const electricShort = Math.max(0, electricDue - electricAmt);

  const submit = async (e) => {
    e.preventDefault(); setError('');

    if (paymentType === 'daily') {
      if (!dailyForm.or_number?.trim()) return setError('OR Number is required.');
      if (!dailyForm.payment_date)      return setError('Payment date is required.');
      if (!dailyAmt && !balanceAmt)     return setError('Please enter a daily rental or balance amount.');
    } else {
      if (!electricForm.or_number?.trim()) return setError('OR Number is required.');
      if (!electricForm.payment_date)      return setError('Payment date is required.');
      if (!electricAmt)                    return setError('Please enter the electric fee amount paid.');
    }

    setLoading(true);
    try {
      let payload;
      if (paymentType === 'daily') {
        payload = {
          stall_id:      stall.id,
          or_number:     dailyForm.or_number.trim(),
          payment_date:  dailyForm.payment_date,
          payment_type:  'daily',
          rental_fee:    dailyAmt,
          electric_fee:  0,
          balance:       balanceAmt,
          apply_interest:dailyForm.apply_interest,
          total_amount:  dailyTotal,
          remarks:       dailyForm.remarks || 'Daily rental payment',
        };
      } else {
        payload = {
          stall_id:       stall.id,
          or_number:      electricForm.or_number.trim(),
          payment_date:   electricForm.payment_date,
          payment_type:   'electric',
          rental_fee:     0,
          electric_fee:   electricAmt,
          electric_due:   electricDue,
          months_covered: electricForm.months_covered,
          balance:        0,
          apply_interest: false,
          total_amount:   electricAmt,
          remarks:        electricForm.remarks || (electricForm.months_covered ? `Electric — ${electricForm.months_covered}` : 'Electric fee payment'),
        };
      }
      await api.post('/night-market/payments', payload);
      onSave();
    } catch (err) { setError(err.response?.data?.message || 'Error saving payment.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="gov-card w-full max-w-md rounded-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 bg-gov-navy">
          <div>
            <h2 className="font-serif text-white font-bold">Record Payment</h2>
            <p className="text-white/50 font-mono text-xs">{stall?.stall_number} · {stall?.owner_name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><MdClose size={22}/></button>
        </div>
        <div className="bg-gov-cream border-b border-gov-border py-2.5 text-center flex-shrink-0">
          <p className="font-serif text-gov-navy font-bold text-sm">OFFICIAL RECEIPT</p>
          <p className="font-mono text-gov-gray text-xs">Night Market · Municipal Treasurer's Office</p>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={submit} className="p-5 space-y-4">
            {error && <div className="bg-red-50 border border-red-300 rounded p-3"><p className="text-red-700 text-sm">{error}</p></div>}

            {/* Stall info */}
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2.5 flex justify-between items-center">
              <div>
                <p className="font-mono text-xs text-gov-blue font-bold">{stall?.stall_number}</p>
                <p className="font-sans text-sm font-semibold text-gov-navy">{stall?.owner_name}</p>
                {stall?.contact_number && <p className="font-mono text-xs text-gov-gray">{stall.contact_number}</p>}
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-gov-gray">Daily Rate</p>
                <p className="font-mono text-gov-navy font-bold text-base">₱{fmt(stall?.rental_rate)}</p>
                {stall?.has_interest && (
                  <span className="bg-amber-100 text-amber-700 font-mono text-xs px-1.5 py-0.5 rounded">{stall.interest_rate}% balance interest</span>
                )}
              </div>
            </div>

            {/* Payment Type Selector */}
            <div>
              <label className="gov-label">Payment Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentType('daily')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    paymentType === 'daily' ? 'border-gov-blue bg-blue-50' : 'border-gov-border hover:border-gov-blue/50 bg-white'}`}>
                  <MdPayments className={`text-2xl ${paymentType === 'daily' ? 'text-gov-blue' : 'text-gov-gray'}`}/>
                  <p className="font-serif font-bold text-gov-navy text-xs">Daily Rental</p>
                  <p className="font-mono text-xs text-gov-gray">Separate OR</p>
                </button>

                <button type="button" onClick={() => setPaymentType('electric')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    paymentType === 'electric' ? 'border-amber-400 bg-amber-50' : 'border-gov-border hover:border-amber-300 bg-white'}`}>
                  <MdBolt className={`text-2xl ${paymentType === 'electric' ? 'text-amber-500' : 'text-gov-gray'}`}/>
                  <p className="font-serif font-bold text-gov-navy text-xs">Electric Fee</p>
                  <p className="font-mono text-xs text-green-600">No interest</p>
                </button>
              </div>

              {paymentType === 'electric' && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2.5 flex items-start gap-2">
                  <MdBolt className="text-amber-500 flex-shrink-0 mt-0.5"/>
                  <p className="text-amber-700 font-mono text-xs">
                    Electric has <strong>no interest</strong> — owners can accumulate and pay multiple months at once using a separate OR number.
                  </p>
                </div>
              )}
            </div>

            {/* ── DAILY RENTAL FORM ── */}
            {paymentType === 'daily' && (
              <>
                <div>
                  <label className="gov-label">OR Number *</label>
                  <input name="or_number" value={dailyForm.or_number} onChange={handleDaily}
                    required className="gov-input font-mono" placeholder="e.g. 2026-NM-001"/>
                </div>
                <div>
                  <label className="gov-label">Payment Date *</label>
                  <input type="date" name="payment_date" value={dailyForm.payment_date}
                    onChange={handleDaily} required className="gov-input"/>
                </div>

                {/* Daily rental amount */}
                <div className="bg-gov-cream border border-gov-border rounded-lg p-3">
                  <p className="font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide mb-2">
                    Daily Rental (₱)
                    <span className="text-gov-gray font-normal normal-case ml-2">Rate: ₱{fmt(stall?.rental_rate)}/day</span>
                  </p>
                  <input type="number" step="0.01" min="0" name="rental_fee"
                    value={dailyForm.rental_fee} onChange={handleDaily}
                    className="gov-input font-mono" placeholder="0.00"/>
                  {dailyAmt > 0 && dailyAmt === parseFloat(stall?.rental_rate) && (
                    <p className="text-green-600 text-xs mt-1 font-mono flex items-center gap-1">
                      <MdCheckCircle size={12}/> Full daily rate paid
                    </p>
                  )}
                </div>

                {/* Unpaid Balance */}
                <div className={`rounded-lg border p-3 ${balanceAmt > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gov-border'}`}>
                  <label className="gov-label">Unpaid Balance (₱) <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                  <input type="number" step="0.01" min="0" name="balance"
                    value={dailyForm.balance} onChange={handleDaily}
                    className="gov-input font-mono" placeholder="0.00 — leave blank if none"/>
                  {stall?.has_interest && balanceAmt > 0 && (
                    <label className={`flex items-center gap-3 cursor-pointer mt-3 p-2.5 rounded border transition-colors ${
                      dailyForm.apply_interest ? 'bg-amber-50 border-amber-400' : 'bg-white border-gov-border hover:border-amber-300'}`}>
                      <input type="checkbox" name="apply_interest" checked={dailyForm.apply_interest} onChange={handleDaily} className="w-4 h-4"/>
                      <div className="flex-1">
                        <p className="font-sans text-sm font-semibold text-gov-navy">Apply {stall?.interest_rate}% Interest on Balance</p>
                        <p className="font-mono text-xs text-gov-gray mt-0.5">₱{fmt(balanceAmt)} × {stall?.interest_rate}% = ₱{fmt(balInterest)}</p>
                      </div>
                      {dailyForm.apply_interest && <span className="bg-amber-500 text-white text-xs font-mono px-2 py-0.5 rounded">ON</span>}
                    </label>
                  )}
                  {!stall?.has_interest && <p className="text-green-600 text-xs font-mono mt-1.5 flex items-center gap-1"><MdCheckCircle className="text-green-500" size={12}/> No interest on this stall</p>}
                </div>

                <div>
                  <label className="gov-label">Remarks <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                  <input name="remarks" value={dailyForm.remarks} onChange={handleDaily} className="gov-input" placeholder="Optional notes..."/>
                </div>

                {/* Total */}
                {dailyTotal > 0 && (
                  <div className="bg-gov-cream border border-gov-border rounded p-3 space-y-1.5">
                    <p className="font-serif font-bold text-gov-navy text-xs uppercase tracking-wide mb-1">Breakdown</p>
                    {dailyAmt > 0 && <div className="flex justify-between text-xs font-mono"><span className="text-gov-gray">Daily rental:</span><span className="font-bold">₱{fmt(dailyAmt)}</span></div>}
                    {balanceAmt > 0 && <div className="flex justify-between text-xs font-mono"><span className="text-red-600">Unpaid balance:</span><span className="text-red-700 font-bold">₱{fmt(balanceAmt)}</span></div>}
                    {balInterest > 0 && <div className="flex justify-between text-xs font-mono"><span className="text-amber-600">Balance interest ({stall?.interest_rate}%):</span><span className="text-amber-700 font-bold">+₱{fmt(balInterest)}</span></div>}
                    <div className="flex justify-between font-mono font-bold border-t border-gov-border pt-1.5">
                      <span className="text-gov-navy">TOTAL:</span>
                      <span className="text-green-700 text-base">₱{fmt(dailyTotal)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── ELECTRIC FORM ── */}
            {paymentType === 'electric' && (
              <>
                <div>
                  <label className="gov-label">OR Number *</label>
                  <input name="or_number" value={electricForm.or_number} onChange={handleElectric}
                    required className="gov-input font-mono" placeholder="e.g. 2026-NM-E001"/>
                </div>
                <div>
                  <label className="gov-label">Payment Date *</label>
                  <input type="date" name="payment_date" value={electricForm.payment_date}
                    onChange={handleElectric} required className="gov-input"/>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                  <p className="font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide flex items-center gap-1">
                    <MdBolt className="text-amber-500"/> Electric Fee
                    <span className="bg-green-100 text-green-700 font-mono font-normal normal-case text-xs px-1.5 py-0.5 rounded ml-1">No interest</span>
                  </p>

                  <div>
                    <label className="gov-label">Months Covered <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                    <input name="months_covered" value={electricForm.months_covered} onChange={handleElectric}
                      className="gov-input font-mono" placeholder="e.g. January–March 2026"/>
                    <p className="text-amber-700 text-xs font-mono mt-1">Fill this if paying accumulated months</p>
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
                      <p className="text-amber-700 text-xs font-mono">Short by ₱{fmt(electricShort)} → carried forward <strong>without interest</strong></p>
                    </div>
                  )}
                  {electricAmt > 0 && electricDue > 0 && electricShort === 0 && (
                    <p className="text-green-600 text-xs font-mono flex items-center gap-1"><MdCheckCircle size={12}/> Electric fully paid</p>
                  )}
                </div>

                <div>
                  <label className="gov-label">Remarks <span className="text-gov-gray font-normal normal-case">(optional)</span></label>
                  <input name="remarks" value={electricForm.remarks} onChange={handleElectric}
                    className="gov-input" placeholder="e.g. Electric for Jan–Mar 2026"/>
                </div>

                <div className="bg-gov-cream border border-gov-border rounded p-3 flex justify-between items-center">
                  <span className="font-serif font-bold text-gov-navy">TOTAL:</span>
                  <span className="font-mono font-bold text-green-700 text-base">₱{fmt(electricAmt)}</span>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="gov-btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="gov-btn-primary min-w-[130px]">
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</span>
                  : paymentType === 'electric' ? 'Post Electric Payment' : 'Post Daily Rental'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY MODAL
// ════════════════════════════════════════════════════════════════════════════
function SummaryModal({ stallId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/night-market/stalls/${stallId}/summary`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [stallId]);

  const paymentsByYear = (data?.payments || []).reduce((acc, p) => {
    const y = new Date(p.payment_date).getFullYear();
    if (!acc[y]) acc[y] = [];
    acc[y].push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="gov-card w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gov-navy p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gov-gold flex items-center justify-center">
              <MdNightlight className="text-gov-navy text-lg"/>
            </div>
            {data && (
              <div>
                <h2 className="font-serif text-white font-bold">{data.stall.stall_number}</h2>
                <p className="text-white/60 font-mono text-xs">{data.stall.owner_name} · Night Market</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><MdClose size={22}/></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-gov-border border-t-gov-navy rounded-full animate-spin"/>
          </div>
        ) : data && (
          <>
            <div className="grid grid-cols-4 divide-x divide-gov-border bg-gov-cream border-b border-gov-border flex-shrink-0">
              {[
                { label: 'Payments',      value: data.payments.length },
                { label: 'Total Rental',  value: `₱${fmt(data.totalRental)}`,   color: 'text-gov-blue' },
                { label: 'Total Electric',value: `₱${fmt(data.totalElectric)}`, color: 'text-amber-600' },
                { label: 'Grand Total',   value: `₱${fmt(data.totalPaid)}`,     color: 'text-green-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="px-3 py-2.5 text-center">
                  <p className="font-mono text-xs text-gov-gray uppercase tracking-wide">{label}</p>
                  <p className={`font-serif font-bold text-base ${color || 'text-gov-navy'}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 bg-white border-b border-gov-border flex-shrink-0 flex flex-wrap gap-4 text-xs">
              <div><p className="font-mono text-gov-gray">Daily Rate</p><p className="font-mono font-bold">₱{fmt(data.stall.rental_rate)}</p></div>
              <div><p className="font-mono text-gov-gray">Contact</p><p className="font-mono">{data.stall.contact_number || '—'}</p></div>
              <div><p className="font-mono text-gov-gray">Address</p><p className="font-mono">{data.stall.address || '—'}</p></div>
              <div><p className="font-mono text-gov-gray">Balance Interest</p>
                <p className={`font-mono font-bold ${data.stall.has_interest ? 'text-amber-600' : 'text-green-600'}`}>
                  {data.stall.has_interest ? `${data.stall.interest_rate}% on unpaid` : 'None'}
                </p>
              </div>
              <div><p className="font-mono text-gov-gray">Status</p><span className={`status-${data.stall.status}`}>{data.stall.status}</span></div>
            </div>

            <div className="overflow-y-auto flex-1">
              {data.payments.length === 0 ? (
                <div className="p-10 text-center">
                  <MdPayments className="text-4xl text-gov-border mx-auto mb-2"/>
                  <p className="font-mono text-gov-gray italic text-sm">No payment records yet.</p>
                </div>
              ) : (
                <>
                  {Object.entries(paymentsByYear).sort(([a],[b]) => b - a).map(([year, yp]) => (
                    <div key={year}>
                      <div className="flex justify-between items-center px-4 py-2 bg-gov-navy/5 border-y border-gov-border sticky top-0">
                        <p className="font-serif font-bold text-gov-navy text-sm">{year}</p>
                        <p className="font-mono text-xs text-gov-blue font-bold">
                          {yp.length} payments · ₱{fmt(yp.reduce((s,p) => s + Number(p.total_amount||0), 0))}
                        </p>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gov-blue/10 text-gov-navy">
                            {['OR No.','Date','Type','Daily Rental','Electric','Balance','Interest','Total','Remarks'].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-serif font-semibold whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {yp.map((p, i) => (
                            <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/40'}>
                              <td className="px-3 py-2 font-mono font-bold text-gov-red">{p.or_number}</td>
                              <td className="px-3 py-2 font-mono text-gov-gray whitespace-nowrap">
                                {new Date(p.payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                              </td>
                              <td className="px-3 py-2">
                                {p.payment_type === 'electric'
                                  ? <span className="bg-amber-100 text-amber-700 font-mono text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 w-fit"><MdBolt size={10}/>Electric</span>
                                  : <span className="bg-blue-100 text-gov-blue font-mono text-xs px-1.5 py-0.5 rounded">Daily</span>}
                              </td>
                              <td className="px-3 py-2 font-mono">₱{fmt(p.rental_fee)}</td>
                              <td className="px-3 py-2 font-mono text-amber-600">₱{fmt(p.electric_fee || 0)}</td>
                              <td className="px-3 py-2 font-mono text-red-600">₱{fmt(p.balance)}</td>
                              <td className="px-3 py-2 font-mono text-amber-600">₱{fmt(p.interest)}</td>
                              <td className="px-3 py-2 font-mono font-bold text-green-700">₱{fmt(p.total_amount)}</td>
                              <td className="px-3 py-2 text-gov-gray italic text-xs">{p.remarks || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="bg-gov-navy px-4 py-3 flex justify-between">
                    <p className="font-serif text-gov-gold font-bold">GRAND TOTAL</p>
                    <div className="flex gap-4 font-mono text-sm">
                      <span className="text-white/70">Rental: ₱{fmt(data.totalRental)}</span>
                      <span className="text-amber-300">Electric: ₱{fmt(data.totalElectric)}</span>
                      <span className="text-gov-gold font-bold">Total: ₱{fmt(data.totalPaid)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function NightMarket() {
  const [stalls, setStalls]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilter]         = useState('');
  const [showStallForm, setShowStallForm] = useState(false);
  const [showPayment, setShowPayment]     = useState(false);
  const [showSummary, setShowSummary]     = useState(false);
  const [editStall, setEditStall]         = useState(null);
  const [payStall, setPayStall]           = useState(null);
  const [summaryStallId, setSummaryStallId] = useState(null);
  const { isAdmin, isCashier } = useAuth();
  const canEdit = isAdmin() || isCashier();

  const fetchStalls = () => {
    setLoading(true);
    api.get('/night-market/stalls').then(r => setStalls(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStalls(); }, []);

  const filtered = stalls.filter(s =>
    (!search || s.stall_number?.toLowerCase().includes(search.toLowerCase()) ||
                s.owner_name?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || s.status === filterStatus)
  );

  const remove = async (id) => {
    if (!confirm('Delete this stall?')) return;
    try { await api.delete(`/night-market/stalls/${id}`); fetchStalls(); }
    catch (err) { alert(err.response?.data?.message || 'Error deleting.'); }
  };

  if (loading) return <Loader message="Loading Night Market..."/>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title flex items-center gap-2"><MdNightlight className="text-gov-gold"/> Night Market</h2>
          <p className="text-gov-gray font-mono text-xs mt-1">Daily rental & electric — separate payments, separate OR numbers</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditStall(null); setShowStallForm(true); }} className="gov-btn-primary flex items-center gap-2">
            <MdAdd/> Add Stall
          </button>
        )}
      </div>

      <div className="gov-card p-4 rounded-lg flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <MdSearch className="text-gov-gray flex-shrink-0"/>
          <input value={search} onChange={e => setSearch(e.target.value)} className="gov-input" placeholder="Search stall no. or owner..."/>
        </div>
        <select value={filterStatus} onChange={e => setFilter(e.target.value)} className="gov-input w-36">
          <option value="">All Status</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
          <option value="delinquent">Delinquent</option>
        </select>
        {(search || filterStatus) && <button onClick={() => { setSearch(''); setFilter(''); }} className="gov-btn-secondary text-xs">Clear</button>}
      </div>

      <div className="flex gap-2 flex-wrap text-xs font-mono">
        <span className="bg-gov-navy text-white px-3 py-1 rounded-full">Total: {filtered.length}</span>
        <span className="bg-green-700 text-white px-3 py-1 rounded-full">Occupied: {filtered.filter(s=>s.status==='occupied').length}</span>
        <span className="bg-gray-500 text-white px-3 py-1 rounded-full">Vacant: {filtered.filter(s=>s.status==='vacant').length}</span>
        <span className="bg-amber-600 text-white px-3 py-1 rounded-full">With Interest: {filtered.filter(s=>s.has_interest).length}</span>
      </div>

      <div className="gov-card rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gov-navy text-white">
              <th className="text-left p-3 font-serif font-semibold">Stall No.</th>
              <th className="text-left p-3 font-serif font-semibold">Owner</th>
              <th className="text-left p-3 font-serif font-semibold">Contact</th>
              <th className="text-right p-3 font-serif font-semibold whitespace-nowrap">Daily Rate (₱)</th>
              <th className="text-center p-3 font-serif font-semibold">Interest</th>
              <th className="text-center p-3 font-serif font-semibold">Status</th>
              <th className="text-center p-3 font-serif font-semibold whitespace-nowrap">Date Started</th>
              <th className="text-center p-3 font-serif font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-10 text-center text-gov-gray font-mono italic">No stalls found.</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gov-cream'}>
                <td className="p-3 font-mono font-bold text-gov-navy">{s.stall_number}</td>
                <td className="p-3">
                  <p className="font-serif font-semibold text-gov-navy">{s.owner_name}</p>
                  {s.address && <p className="text-gov-gray text-xs font-mono">{s.address}</p>}
                </td>
                <td className="p-3 font-mono text-xs text-gov-gray">{s.contact_number || '—'}</td>
                <td className="p-3 font-mono text-right font-bold">₱{fmt(s.rental_rate)}</td>
                <td className="p-3 text-center">
                  {s.has_interest
                    ? <span className="bg-amber-100 text-amber-700 text-xs font-mono px-2 py-0.5 rounded-full font-bold">{s.interest_rate}%</span>
                    : <span className="text-gov-gray font-mono text-xs">None</span>}
                </td>
                <td className="p-3 text-center"><span className={`status-${s.status}`}>{s.status}</span></td>
                <td className="p-3 font-mono text-xs text-gov-gray text-center">
                  {s.date_started ? new Date(s.date_started).toLocaleDateString('en-PH') : '—'}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setSummaryStallId(s.id); setShowSummary(true); }} className="p-1.5 text-gov-blue hover:bg-blue-50 rounded" title="View Summary"><MdVisibility size={16}/></button>
                    {canEdit && (
                      <>
                        <button onClick={() => { setPayStall(s); setShowPayment(true); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Record Payment"><MdPayments size={16}/></button>
                        <button onClick={() => { setEditStall(s); setShowStallForm(true); }} className="p-1.5 text-gov-gray hover:bg-gray-50 rounded" title="Edit"><MdEdit size={16}/></button>
                      </>
                    )}
                    {isAdmin() && <button onClick={() => remove(s.id)} className="p-1.5 text-gov-red hover:bg-red-50 rounded" title="Delete"><MdDelete size={16}/></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showStallForm && <StallFormModal stall={editStall} onClose={() => setShowStallForm(false)} onSave={() => { setShowStallForm(false); fetchStalls(); }}/>}
      {showPayment && payStall && <PaymentModal stall={payStall} onClose={() => setShowPayment(false)} onSave={() => { setShowPayment(false); }}/>}
      {showSummary && summaryStallId && <SummaryModal stallId={summaryStallId} onClose={() => { setShowSummary(false); setSummaryStallId(null); }}/>}
    </div>
  );
}