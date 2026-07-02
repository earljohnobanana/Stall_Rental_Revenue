import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdFilterList,
         MdStorefront, MdNightlight, MdBolt, MdPayments as MdPayIcon } from 'react-icons/md';
import api from '../services/api';
import Loader from '../components/Loader';
import PaymentModal from '../components/PaymentModal';
import { useAuth } from '../contexts/AuthContext';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

const MONTHS = ['','January','February','March','April','May','June',
                'July','August','September','October','November','December'];

export default function Payments() {
  const [section, setSection]           = useState('stalls'); // 'stalls' | 'nightmarket'

  // Stall payments state
  const [payments, setPayments]         = useState([]);
  const [loadingStalls, setLoadingStalls] = useState(true);

  // Night market payments state
  const [nmPayments, setNmPayments]     = useState([]);
  const [loadingNm, setLoadingNm]       = useState(false);

  const [search, setSearch]             = useState('');
  const [filterMonth, setFilterMonth]   = useState('');
  const [filterYear, setFilterYear]     = useState(String(new Date().getFullYear()));
  const [showModal, setShowModal]       = useState(false);
  const [editPayment, setEditPayment]   = useState(null);
  const [showFilters, setShowFilters]   = useState(false);
  const { isAdmin, isCashier }          = useAuth();
  const canEdit = isAdmin() || isCashier();

  // ── Fetch stall payments ───────────────────────────────────
  const fetchPayments = () => {
    setLoadingStalls(true);
    api.get(`/payments?year=${filterYear}&month=${filterMonth}`)
      .then(r => setPayments(r.data || []))
      .catch(() => setPayments([]))
      .finally(() => setLoadingStalls(false));
  };

  // ── Fetch night market payments ───────────────────────────
  const fetchNmPayments = () => {
    setLoadingNm(true);
    api.get(`/night-market/payments?year=${filterYear}&month=${filterMonth}`)
      .then(r => setNmPayments(r.data || []))
      .catch(() => setNmPayments([]))
      .finally(() => setLoadingNm(false));
  };

  useEffect(() => {
    fetchPayments();
    fetchNmPayments();
  }, [filterYear, filterMonth]);

  // ── Filter logic ──────────────────────────────────────────
  const filteredStalls = payments.filter(p =>
    !search ||
    p.or_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.stall_number?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNm = nmPayments.filter(p =>
    !search ||
    p.or_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.stall_number?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Summaries ─────────────────────────────────────────────
  const stallSummary = {
    count:    filteredStalls.length,
    rental:   filteredStalls.reduce((s, p) => s + Number(p.rental_fee   || 0), 0),
    electric: filteredStalls.reduce((s, p) => s + Number(p.electric_fee || 0), 0),
    total:    filteredStalls.reduce((s, p) => s + Number(p.total_amount || 0), 0),
  };

  const nmSummary = {
    count:    filteredNm.length,
    rental:   filteredNm.filter(p => p.payment_type !== 'electric').reduce((s, p) => s + Number(p.rental_fee   || 0), 0),
    electric: filteredNm.filter(p => p.payment_type === 'electric').reduce((s, p) => s + Number(p.total_amount || 0), 0),
    total:    filteredNm.reduce((s, p) => s + Number(p.total_amount || 0), 0),
  };

  // ── Delete handlers ───────────────────────────────────────
  const removeStall = async (id) => {
    if (!confirm('Delete this payment record?')) return;
    await api.delete(`/payments/${id}`);
    fetchPayments();
  };

  const removeNm = async (id) => {
    if (!confirm('Delete this night market payment?')) return;
    await api.delete(`/night-market/payments/${id}`);
    fetchNmPayments();
  };

  const isLoading = section === 'stalls' ? loadingStalls : loadingNm;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="page-title">Payments & Collections</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(f => !f)}
            className="gov-btn-secondary flex items-center gap-1.5 text-xs lg:hidden">
            <MdFilterList/> Filters
          </button>
          {canEdit && section === 'stalls' && (
            <button onClick={() => { setEditPayment(null); setShowModal(true); }}
              className="gov-btn-primary flex items-center gap-1.5 text-xs md:text-sm">
              <MdAdd/> <span className="hidden sm:inline">Record</span> Payment
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setSection('stalls'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-serif font-bold text-sm transition-all ${
            section === 'stalls'
              ? 'bg-gov-navy text-white'
              : 'bg-white border border-gov-border text-gov-gray hover:bg-gov-cream'}`}>
          <MdStorefront/> Regular Stalls
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded-full ${section === 'stalls' ? 'bg-white/20 text-white' : 'bg-gov-cream text-gov-gray'}`}>
            {filteredStalls.length}
          </span>
        </button>
        <button onClick={() => { setSection('nightmarket'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-serif font-bold text-sm transition-all ${
            section === 'nightmarket'
              ? 'bg-gov-navy text-white'
              : 'bg-white border border-gov-border text-gov-gray hover:bg-gov-cream'}`}>
          <MdNightlight className={section === 'nightmarket' ? 'text-gov-gold' : 'text-gov-gray'}/> Night Market
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded-full ${section === 'nightmarket' ? 'bg-white/20 text-white' : 'bg-gov-cream text-gov-gray'}`}>
            {filteredNm.length}
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className={`gov-card p-3 rounded-lg ${showFilters ? 'block' : 'hidden'} lg:block`}>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <MdSearch className="text-gov-gray flex-shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="gov-input text-xs" placeholder="Search OR, owner, stall..."/>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="gov-input w-24 text-xs">
              {[2022,2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="gov-input w-32 text-xs">
              <option value="">All Months</option>
              {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            {(search || filterMonth) && (
              <button onClick={() => { setSearch(''); setFilterMonth(''); }} className="gov-btn-secondary text-xs">Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {section === 'stalls' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: 'Transactions',   value: stallSummary.count,               color: 'text-gov-navy', isNum: true },
            { label: 'Rental Total',   value: `₱${fmt(stallSummary.rental)}`,   color: 'text-gov-blue' },
            { label: 'Electric Total', value: `₱${fmt(stallSummary.electric)}`, color: 'text-amber-600' },
            { label: 'Grand Total',    value: `₱${fmt(stallSummary.total)}`,    color: 'text-green-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="gov-card px-3 py-2.5 rounded-lg text-center">
              <p className="gov-label text-xs">{label}</p>
              <p className={`font-serif font-bold text-base md:text-lg truncate ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: 'Transactions',    value: nmSummary.count,               color: 'text-gov-navy' },
            { label: 'Daily Rental',    value: `₱${fmt(nmSummary.rental)}`,   color: 'text-gov-blue' },
            { label: 'Electric Total',  value: `₱${fmt(nmSummary.electric)}`, color: 'text-amber-600' },
            { label: 'Grand Total',     value: `₱${fmt(nmSummary.total)}`,    color: 'text-green-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="gov-card px-3 py-2.5 rounded-lg text-center">
              <p className="gov-label text-xs">{label}</p>
              <p className={`font-serif font-bold text-base md:text-lg truncate ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="gov-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-4 border-gov-border border-t-gov-navy rounded-full animate-spin mx-auto"/>
              <p className="font-mono text-gov-gray text-sm mt-3">Loading payments...</p>
            </div>
          ) : section === 'stalls' ? (

            /* ── STALLS TABLE ── */
            <table className="w-full text-xs md:text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gov-navy text-white">
                  {['OR No.','Date','Type','Stall','Owner','Building','Rental (₱)','Electric (₱)','Total (₱)','Remarks','Actions'].map(h => (
                    <th key={h} className="text-left p-2 md:p-3 font-serif font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStalls.length === 0 ? (
                  <tr><td colSpan={11} className="p-8 text-center text-gov-gray font-mono italic text-xs">
                    No stall payment records found.
                  </td></tr>
                ) : filteredStalls.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gov-cream'}>
                    <td className="p-2 md:p-3 font-mono font-bold text-gov-red text-xs">{p.or_number}</td>
                    <td className="p-2 md:p-3 font-mono text-xs whitespace-nowrap">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                    </td>
                    <td className="p-2 md:p-3">
                      {p.payment_type === 'security_deposit'
                        ? <span className="bg-gov-gold/20 text-gov-navy font-mono text-xs px-1.5 py-0.5 rounded">Sec. Dep.</span>
                        : p.payment_type === 'electric'
                        ? <span className="bg-amber-100 text-amber-700 font-mono text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 w-fit"><MdBolt size={10}/>Electric</span>
                        : <span className="bg-blue-100 text-gov-blue font-mono text-xs px-1.5 py-0.5 rounded">Rental</span>}
                    </td>
                    <td className="p-2 md:p-3 font-mono text-gov-blue font-bold text-xs">{p.stall_number || '—'}</td>
                    <td className="p-2 md:p-3 font-sans text-xs font-semibold">{p.owner_name || '—'}</td>
                    <td className="p-2 md:p-3 text-xs text-gov-gray">{p.building_name || '—'}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-xs">₱{fmt(p.rental_fee)}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-xs text-amber-600">₱{fmt(p.electric_fee)}</td>
                    <td className="p-2 md:p-3 font-mono text-right font-bold text-green-700 text-xs">₱{fmt(p.total_amount)}</td>
                    <td className="p-2 md:p-3 text-xs text-gov-gray italic max-w-[120px] truncate">{p.remarks || '—'}</td>
                    <td className="p-2 md:p-3">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button onClick={() => { setEditPayment(p); setShowModal(true); }}
                            className="p-1 text-gov-blue hover:bg-blue-50 rounded"><MdEdit size={15}/></button>
                        )}
                        {isAdmin() && (
                          <button onClick={() => removeStall(p.id)}
                            className="p-1 text-gov-red hover:bg-red-50 rounded"><MdDelete size={15}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredStalls.length > 0 && (
                <tfoot>
                  <tr className="bg-gov-navy">
                    <td colSpan={6} className="p-2 md:p-3 font-serif text-gov-gold font-bold text-right text-xs">
                      TOTALS ({stallSummary.count} records):
                    </td>
                    <td className="p-2 md:p-3 font-mono text-right text-gov-gold font-bold text-xs">₱{fmt(stallSummary.rental)}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-gov-gold font-bold text-xs">₱{fmt(stallSummary.electric)}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-gov-gold font-bold text-xs">₱{fmt(stallSummary.total)}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>

          ) : (

            /* ── NIGHT MARKET TABLE ── */
            <table className="w-full text-xs md:text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gov-navy text-white">
                  {['OR No.','Date','Type','Stall No.','Owner','Daily Rental (₱)','Electric (₱)','Balance (₱)','Interest (₱)','Total (₱)','Remarks','Actions'].map(h => (
                    <th key={h} className="text-left p-2 md:p-3 font-serif font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNm.length === 0 ? (
                  <tr><td colSpan={12} className="p-8 text-center text-gov-gray font-mono italic text-xs">
                    No night market payment records found.
                  </td></tr>
                ) : filteredNm.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/40'}>
                    <td className="p-2 md:p-3 font-mono font-bold text-gov-red text-xs">{p.or_number}</td>
                    <td className="p-2 md:p-3 font-mono text-xs whitespace-nowrap">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                    </td>
                    <td className="p-2 md:p-3">
                      {p.payment_type === 'electric'
                        ? <span className="bg-amber-100 text-amber-700 font-mono text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 w-fit"><MdBolt size={10}/>Electric</span>
                        : <span className="bg-blue-100 text-gov-blue font-mono text-xs px-1.5 py-0.5 rounded">Daily</span>}
                    </td>
                    <td className="p-2 md:p-3 font-mono text-gov-blue font-bold text-xs">{p.stall_number || '—'}</td>
                    <td className="p-2 md:p-3 font-sans text-xs font-semibold">{p.owner_name || '—'}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-xs">₱{fmt(p.rental_fee)}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-xs text-amber-600">₱{fmt(p.electric_fee || 0)}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-xs text-red-600">₱{fmt(p.balance || 0)}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-xs text-amber-600">₱{fmt(p.interest || 0)}</td>
                    <td className="p-2 md:p-3 font-mono text-right font-bold text-green-700 text-xs">₱{fmt(p.total_amount)}</td>
                    <td className="p-2 md:p-3 text-xs text-gov-gray italic max-w-[120px] truncate">{p.remarks || '—'}</td>
                    <td className="p-2 md:p-3">
                      {isAdmin() && (
                        <button onClick={() => removeNm(p.id)}
                          className="p-1 text-gov-red hover:bg-red-50 rounded"><MdDelete size={15}/></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredNm.length > 0 && (
                <tfoot>
                  <tr className="bg-gov-navy">
                    <td colSpan={5} className="p-2 md:p-3 font-serif text-gov-gold font-bold text-right text-xs">
                      TOTALS ({nmSummary.count} records):
                    </td>
                    <td className="p-2 md:p-3 font-mono text-right text-gov-gold font-bold text-xs">₱{fmt(nmSummary.rental)}</td>
                    <td className="p-2 md:p-3 font-mono text-right text-amber-300 font-bold text-xs">₱{fmt(nmSummary.electric)}</td>
                    <td colSpan={2}/>
                    <td className="p-2 md:p-3 font-mono text-right text-gov-gold font-bold text-xs">₱{fmt(nmSummary.total)}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <PaymentModal
          payment={editPayment}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchPayments(); }}
        />
      )}
    </div>
  );
}