import { useState, useEffect } from 'react';
import { MdClose, MdPayments, MdWarning, MdCheckCircle, MdStorefront, MdPerson, MdHistory, MdAdd, MdSave, MdDelete} from 'react-icons/md';
import api from '../services/api';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function StallSummaryModal({ stall, onClose }) {
  const [payments, setPayments]   = useState([]);
  const [balance, setBalance]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('payments');
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    owner_name: '', contact_number: '', address: '',
    rental_rate: '', security_deposit: '',
    date_started: '', date_ended: '', remarks: '',
  });
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyError, setHistoryError]   = useState('');

  useEffect(() => {
    if (!stall) return;
    setLoading(true);

    const requests = [
      // Fetch ALL payments for this stall — all owners past and present
      api.get(`/payments?stall_id=${stall.id}`).catch(() => ({ data: [] })),
      api.get(`/stalls/${stall.id}/history`).catch(() => ({ data: [] })),
    ];

    if (stall.owner_id) {
      requests.push(api.get(`/balances/owner/${stall.owner_id}?payment_date=${new Date().toISOString().split('T')[0]}`).catch(() => ({ data: null })));
    }

    Promise.all(requests).then(([p, h, b]) => {
      setPayments(p.data || []);
      setHistory(h.data || []);
      setBalance(b?.data || null);
    }).finally(() => setLoading(false));
  }, [stall]);

  // Group payments by year
  const paymentsByYear = payments.reduce((acc, p) => {
    const y = new Date(p.payment_date).getFullYear();
    if (!acc[y]) acc[y] = [];
    acc[y].push(p);
    return acc;
  }, {});

  const totalPaid     = payments.reduce((s, p) => s + Number(p.total_amount  || 0), 0);
  const totalRental   = payments.reduce((s, p) => s + Number(p.rental_fee    || 0), 0);
  const totalElectric = payments.reduce((s, p) => s + Number(p.electric_fee  || 0), 0);

  const tabs = [
    { key: 'payments', label: 'Payment History', icon: MdPayments },
    { key: 'balance',  label: 'Balance',         icon: MdWarning  },
    { key: 'history',  label: 'Past Owners',      icon: MdHistory  },
  ];

  const deleteHistory = async (historyId) => {
    if (!confirm('Delete this past owner record? This cannot be undone.')) return;
    try {
      await api.delete(`/stalls/${stall.id}/history/${historyId}`);
      // Reload history
      const res = await api.get(`/stalls/${stall.id}/history`);
      setHistory(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting past owner record.');
    }
  };

  const saveHistory = async () => {
    if (!historyForm.owner_name?.trim()) { setHistoryError('Owner name is required.'); return; }
    if (!historyForm.date_ended)         { setHistoryError('Date ended is required.'); return; }
    setSavingHistory(true); setHistoryError('');
    try {
      await api.post(`/stalls/${stall.id}/history`, {
        stall_number: stall.stall_number,
        ...historyForm,
      });
      setShowAddHistory(false);
      setHistoryForm({ owner_name:'', contact_number:'', address:'',
        rental_rate:'', security_deposit:'', date_started:'', date_ended:'', remarks:'' });
      // Reload history
      const res = await api.get(`/stalls/${stall.id}/history`);
      setHistory(res.data || []);
    } catch (err) {
      setHistoryError(err.response?.data?.message || 'Error saving past owner.');
    } finally { setSavingHistory(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="gov-card w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gov-navy p-4 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gov-gold flex items-center justify-center flex-shrink-0">
              <MdStorefront className="text-gov-navy text-xl" />
            </div>
            <div>
              <h2 className="font-serif text-white font-bold text-lg">{stall.stall_number}</h2>
              <p className="text-white/60 font-mono text-xs">{stall.building_name} · {stall.category_name || 'No category'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
            {stall.owner_name && (
              <div className="text-right">
                <p className="text-white/50 text-xs font-mono">Current Owner</p>
                <p className="text-white font-serif font-bold text-sm">{stall.owner_name}</p>
                <p className="text-gov-gold font-mono text-xs">
                  Monthly: ₱{fmt(stall.rental_rate)}
                </p>
              </div>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white flex-shrink-0">
              <MdClose size={22} />
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {!loading && (
          <div className="grid grid-cols-3 divide-x divide-gov-border bg-gov-cream border-b border-gov-border flex-shrink-0">
            <div className="px-4 py-2.5 text-center">
              <p className="font-mono text-xs text-gov-gray uppercase tracking-wide">Total Payments</p>
              <p className="font-serif font-bold text-gov-navy text-lg">{payments.length}</p>
            </div>
            <div className="px-4 py-2.5 text-center">
              <p className="font-mono text-xs text-gov-gray uppercase tracking-wide">Total Collected</p>
              <p className="font-serif font-bold text-green-700 text-lg">₱{fmt(totalPaid)}</p>
            </div>
            <div className="px-4 py-2.5 text-center">
              <p className="font-mono text-xs text-gov-gray uppercase tracking-wide">Outstanding Balance</p>
              <p className={`font-serif font-bold text-lg ${balance?.has_balance ? 'text-red-600' : 'text-green-600'}`}>
                {balance?.has_balance ? `₱${fmt(balance.total_due)}` : '₱0.00'}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gov-border bg-white flex-shrink-0">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-serif font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-gov-navy text-gov-navy'
                  : 'border-transparent text-gov-gray hover:text-gov-navy'
              }`}>
              <Icon size={14} />
              {label}
              {key === 'balance' && balance?.has_balance && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-mono">
                  !
                </span>
              )}
              {key === 'history' && history.length > 0 && (
                <span className="ml-1 bg-gov-blue text-white text-xs rounded-full px-1.5 font-mono">
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-gov-border border-t-gov-navy rounded-full animate-spin" />
            </div>
          ) : (

            <>
              {/* ── PAYMENT HISTORY TAB ── */}
              {activeTab === 'payments' && (
                <div>
                  {payments.length === 0 ? (
                    <div className="p-10 text-center">
                      <MdPayments className="text-4xl text-gov-border mx-auto mb-2" />
                      <p className="font-mono text-gov-gray italic text-sm">No payment records found.</p>
                    </div>
                  ) : (
                    <>
                      {/* Group by year */}
                      {Object.entries(paymentsByYear).sort(([a],[b]) => b - a).map(([year, yearPayments]) => {
                        const yearTotal = yearPayments.reduce((s, p) => s + Number(p.total_amount || 0), 0);
                        return (
                          <div key={year}>
                            {/* Year header */}
                            <div className="flex items-center justify-between px-4 py-2 bg-gov-navy/5 border-y border-gov-border sticky top-0">
                              <p className="font-serif font-bold text-gov-navy text-sm">{year}</p>
                              <p className="font-mono text-xs text-gov-blue font-bold">
                                {yearPayments.length} payments · ₱{fmt(yearTotal)}
                              </p>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gov-blue/10 text-gov-navy">
                                  <th className="text-left px-4 py-2 font-serif font-semibold">OR No.</th>
                                  <th className="text-left px-4 py-2 font-serif font-semibold">Date</th>
                                  <th className="text-right px-4 py-2 font-serif font-semibold">Rental</th>
                                  <th className="text-right px-4 py-2 font-serif font-semibold">Electric</th>
                                  <th className="text-right px-4 py-2 font-serif font-semibold">Total</th>
                                  <th className="text-left px-4 py-2 font-serif font-semibold">Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {yearPayments.map((p, i) => (
                                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/50'}>
                                    <td className="px-4 py-2 font-mono font-bold text-gov-red">{p.or_number}</td>
                                    <td className="px-4 py-2 font-mono text-gov-gray">
                                      {new Date(p.payment_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-right">₱{fmt(p.rental_fee)}</td>
                                    <td className="px-4 py-2 font-mono text-right">₱{fmt(p.electric_fee)}</td>
                                    <td className="px-4 py-2 font-mono text-right font-bold text-green-700">₱{fmt(p.total_amount)}</td>
                                    <td className="px-4 py-2 text-gov-gray italic">{p.remarks || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-gov-navy/5 border-t border-gov-border">
                                  <td colSpan={2} className="px-4 py-2 font-serif font-bold text-gov-navy text-right text-xs">{year} TOTAL:</td>
                                  <td className="px-4 py-2 font-mono text-right font-bold text-xs">
                                    ₱{fmt(yearPayments.reduce((s,p) => s + Number(p.rental_fee||0), 0))}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-right font-bold text-xs">
                                    ₱{fmt(yearPayments.reduce((s,p) => s + Number(p.electric_fee||0), 0))}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-right font-bold text-green-700 text-xs">₱{fmt(yearTotal)}</td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })}

                      {/* Grand total */}
                      <div className="bg-gov-navy px-4 py-3 flex justify-between items-center">
                        <p className="font-serif text-gov-gold font-bold">GRAND TOTAL</p>
                        <div className="flex gap-6 font-mono text-sm">
                          <span className="text-white/70">Rental: ₱{fmt(totalRental)}</span>
                          <span className="text-white/70">Electric: ₱{fmt(totalElectric)}</span>
                          <span className="text-gov-gold font-bold">Total: ₱{fmt(totalPaid)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── BALANCE TAB ── */}
              {activeTab === 'balance' && (
                <div className="p-4">
                  {!stall.owner_id ? (
                    <div className="p-8 text-center">
                      <p className="font-mono text-gov-gray italic text-sm">No owner assigned to this stall.</p>
                    </div>
                  ) : !balance?.has_balance ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <MdCheckCircle className="text-5xl text-green-500" />
                      <p className="font-serif font-bold text-green-700 text-lg">No Outstanding Balance</p>
                      <p className="font-mono text-gov-gray text-sm">
                        {stall.owner_name} is up to date on all payments.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Balance alert header */}
                      <div className="bg-red-700 rounded-lg px-4 py-3 flex items-center gap-3">
                        <MdWarning className="text-white text-2xl flex-shrink-0" />
                        <div>
                          <p className="text-white font-serif font-bold">Outstanding Balance</p>
                          <p className="text-red-200 font-mono text-xs mt-0.5">
                            Rental balance accrues 25% monthly interest · Electric balance has no interest
                          </p>
                        </div>
                      </div>

                      {/* Balance rows */}
                      {balance.balance_details.map(b => (
                        <div key={b.id} className="bg-white border border-red-200 rounded-lg overflow-hidden">
                          <div className="bg-red-50 px-4 py-2 flex justify-between items-center border-b border-red-200">
                            <p className="font-serif font-bold text-red-800">{b.month_name}</p>
                            <p className="font-mono font-bold text-red-700">Total Due: ₱{fmt(b.total_due)}</p>
                          </div>
                          <div className="p-3 grid grid-cols-2 gap-3">
                            {Number(b.rental_balance) > 0 && (
                              <div className="bg-red-50 rounded p-2.5">
                                <p className="font-mono text-xs text-red-600 font-bold uppercase mb-1">
                                  Rental (25%/mo interest)
                                </p>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-red-500 font-mono">Unpaid amount:</span>
                                    <span className="text-xs text-red-700 font-mono font-bold">₱{fmt(b.rental_balance)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-red-500 font-mono">Months overdue:</span>
                                    <span className="text-xs text-red-700 font-mono">{b.months_elapsed} month{b.months_elapsed !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-red-500 font-mono">Interest accrued:</span>
                                    <span className="text-xs text-red-700 font-mono font-bold">₱{fmt(b.rental_interest)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-red-200 pt-1 mt-1">
                                    <span className="text-xs text-red-700 font-mono font-bold">Rental total due:</span>
                                    <span className="text-xs text-red-800 font-mono font-bold">₱{fmt(b.rental_with_interest)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {Number(b.electric_balance) > 0 && (
                              <div className="bg-amber-50 rounded p-2.5">
                                <p className="font-mono text-xs text-amber-700 font-bold uppercase mb-1">
                                  Electric (no interest)
                                </p>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-amber-600 font-mono">Unpaid amount:</span>
                                    <span className="text-xs text-amber-800 font-mono font-bold">₱{fmt(b.electric_balance)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-amber-600 font-mono">Interest:</span>
                                    <span className="text-xs text-amber-700 font-mono">None</span>
                                  </div>
                                  <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                                    <span className="text-xs text-amber-700 font-mono font-bold">Electric total due:</span>
                                    <span className="text-xs text-amber-800 font-mono font-bold">₱{fmt(b.electric_balance)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Grand total */}
                      <div className="bg-gov-navy rounded-lg p-4 grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-white/50 font-mono text-xs">Rental Balance</p>
                          <p className="text-red-300 font-mono font-bold">₱{fmt(balance.total_rental_balance)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/50 font-mono text-xs">Interest (25%/mo)</p>
                          <p className="text-red-300 font-mono font-bold">₱{fmt(balance.total_rental_interest)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/50 font-mono text-xs">Electric Balance</p>
                          <p className="text-amber-300 font-mono font-bold">₱{fmt(balance.total_electric_balance)}</p>
                        </div>
                        <div className="col-span-3 border-t border-white/20 pt-3 text-center">
                          <p className="text-white/60 font-mono text-xs">TOTAL AMOUNT DUE</p>
                          <p className="text-gov-gold font-serif font-bold text-2xl">₱{fmt(balance.total_due)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PAST OWNERS TAB ── */}
              {activeTab === 'history' && (
                <div className="p-4">
                  {/* Add Past Owner button */}
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-mono text-xs text-gov-gray">
                      {history.length} previous owner{history.length !== 1 ? 's' : ''} on record
                    </p>
                    <button onClick={() => setShowAddHistory(s => !s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-navy text-white rounded font-mono text-xs hover:bg-gov-navy/80 transition-colors">
                      <MdAdd size={14}/> Add Past Owner
                    </button>
                  </div>

                  {/* Add Past Owner Form */}
                  {showAddHistory && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4 space-y-3">
                      <p className="font-serif font-bold text-gov-navy text-sm">Add Previous Owner Record</p>
                      {historyError && <p className="text-red-600 text-xs font-mono">{historyError}</p>}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="gov-label">Owner Full Name *</label>
                          <input value={historyForm.owner_name}
                            onChange={e => setHistoryForm(f => ({...f, owner_name: e.target.value}))}
                            className="gov-input" placeholder="e.g. JUAN DELA CRUZ"/>
                        </div>
                        <div>
                          <label className="gov-label">Contact Number</label>
                          <input value={historyForm.contact_number}
                            onChange={e => setHistoryForm(f => ({...f, contact_number: e.target.value}))}
                            className="gov-input font-mono" placeholder="09XXXXXXXXX"/>
                        </div>
                        <div>
                          <label className="gov-label">Address</label>
                          <input value={historyForm.address}
                            onChange={e => setHistoryForm(f => ({...f, address: e.target.value}))}
                            className="gov-input" placeholder="e.g. Sta. Catalina"/>
                        </div>
                        <div>
                          <label className="gov-label">Rental Rate (₱)</label>
                          <input type="number" step="0.01" value={historyForm.rental_rate}
                            onChange={e => setHistoryForm(f => ({...f, rental_rate: e.target.value}))}
                            className="gov-input font-mono" placeholder="0.00"/>
                        </div>
                        <div>
                          <label className="gov-label">Security Deposit (₱)</label>
                          <input type="number" step="0.01" value={historyForm.security_deposit}
                            onChange={e => setHistoryForm(f => ({...f, security_deposit: e.target.value}))}
                            className="gov-input font-mono" placeholder="0.00"/>
                        </div>
                        <div>
                          <label className="gov-label">Date Started</label>
                          <input type="date" value={historyForm.date_started}
                            onChange={e => setHistoryForm(f => ({...f, date_started: e.target.value}))}
                            className="gov-input"/>
                        </div>
                        <div>
                          <label className="gov-label">Date Ended *</label>
                          <input type="date" value={historyForm.date_ended}
                            onChange={e => setHistoryForm(f => ({...f, date_ended: e.target.value}))}
                            className="gov-input"/>
                        </div>
                        <div className="col-span-2">
                          <label className="gov-label">Reason / Remarks</label>
                          <input value={historyForm.remarks}
                            onChange={e => setHistoryForm(f => ({...f, remarks: e.target.value}))}
                            className="gov-input" placeholder="e.g. Surrendered, Transferred, Deceased"/>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddHistory(false)} className="gov-btn-secondary text-xs">Cancel</button>
                        <button type="button" onClick={saveHistory} disabled={savingHistory}
                          className="gov-btn-primary text-xs flex items-center gap-1.5">
                          <MdSave size={14}/> {savingHistory ? 'Saving...' : 'Save Past Owner'}
                        </button>
                      </div>
                    </div>
                  )}

                  {history.length === 0 && !showAddHistory ? (
                    <div className="p-8 text-center">
                      <MdHistory className="text-4xl text-gov-border mx-auto mb-2" />
                      <p className="font-mono text-gov-gray italic text-sm">No past owners recorded.</p>
                      <p className="font-mono text-gov-gray text-xs mt-1">
                        Click "Add Past Owner" to manually record a previous owner.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.map((h, i) => (
                        <div key={h.id} className="bg-white border border-gov-border rounded-lg overflow-hidden">
                          <div className="bg-gov-navy/5 px-4 py-2 flex items-center justify-between border-b border-gov-border">
                            <div className="flex items-center gap-2">
                              <MdPerson className="text-gov-blue" />
                              <p className="font-serif font-bold text-gov-navy">{h.owner_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-gray-200 text-gray-600 text-xs font-mono px-2 py-0.5 rounded-full">
                                Past Owner #{history.length - i}
                              </span>
                              <button
                                onClick={() => deleteHistory(h.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete this past owner record">
                                <MdDelete size={15}/>
                              </button>
                            </div>
                          </div>
                          <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                            {h.contact_number && (
                              <div className="flex justify-between">
                                <span className="text-gov-gray font-mono">Contact:</span>
                                <span className="font-mono text-gov-navy">{h.contact_number}</span>
                              </div>
                            )}
                            {h.address && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-gov-gray font-mono">Address:</span>
                                <span className="font-mono text-gov-navy">{h.address}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gov-gray font-mono">Rental rate:</span>
                              <span className="font-mono text-gov-navy font-bold">₱{fmt(h.rental_rate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gov-gray font-mono">Security dep.:</span>
                              <span className="font-mono text-gov-navy">₱{fmt(h.security_deposit)}</span>
                            </div>
                            {h.date_started && (
                              <div className="flex justify-between">
                                <span className="text-gov-gray font-mono">Date started:</span>
                                <span className="font-mono text-gov-navy">
                                  {new Date(h.date_started).toLocaleDateString('en-PH')}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gov-gray font-mono">Date ended:</span>
                              <span className="font-mono text-gov-red font-bold">
                                {new Date(h.date_ended).toLocaleDateString('en-PH')}
                              </span>
                            </div>
                            {h.remarks && (
                              <div className="col-span-2 flex justify-between">
                                <span className="text-gov-gray font-mono">Reason:</span>
                                <span className="font-mono text-gov-gray italic">{h.remarks}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}