import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdVisibility } from 'react-icons/md';
import api from '../services/api';
import Loader from '../components/Loader';
import StallFormModal from '../components/StallFormModal';
import StallSummaryModal from '../components/StallSummaryModal';
import { useAuth } from '../contexts/AuthContext';

export default function Stalls() {
  const [stalls, setStalls]         = useState([]);
  const [buildings, setBuildings]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [showSummary, setShowSummary]     = useState(false);
  const [editStall, setEditStall]         = useState(null);
  const [summaryStall, setSummaryStall]   = useState(null);
  const { isAdmin, isCashier }      = useAuth();
  const canEdit = isAdmin() || isCashier();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/stalls'),
      api.get('/buildings'),
      api.get('/stall-categories'),
    ]).then(([s, b, c]) => {
      setStalls(s.data);
      setBuildings(b.data);
      setCategories(c.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = stalls.filter(s =>
    (!search || s.stall_number?.toLowerCase().includes(search.toLowerCase()) ||
                s.owner_name?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterBuilding || String(s.building_id) === filterBuilding) &&
    (!filterStatus   || s.status === filterStatus)
  );

  const openAdd     = () => { setEditStall(null); setShowModal(true); };
  const openEdit    = (s) => { setEditStall(s);   setShowModal(true); };
  const openSummary = (s) => { setSummaryStall(s); setShowSummary(true); };

  const remove = async (id) => {
    if (!confirm('Delete this stall? The owner record will also be removed.')) return;
    try {
      await api.delete(`/stalls/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting stall.');
    }
  };

  if (loading) return <Loader message="Loading stalls..." />;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="page-title">Stalls</h2>
        {canEdit && (
          <button onClick={openAdd} className="gov-btn-primary flex items-center gap-2">
            <MdAdd /> Add Stall
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="gov-card p-4 rounded-lg flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <MdSearch className="text-gov-gray flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="gov-input" placeholder="Search stall no. or owner..." />
        </div>
        <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} className="gov-input w-44">
          <option value="">All Buildings</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="gov-input w-36">
          <option value="">All Status</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
          <option value="delinquent">Delinquent</option>
        </select>
        {(search || filterBuilding || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterBuilding(''); setFilterStatus(''); }}
            className="gov-btn-secondary text-xs">Clear</button>
        )}
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap text-xs font-mono">
        <span className="bg-gov-navy text-white px-3 py-1 rounded-full">Total: {filtered.length}</span>
        <span className="bg-green-700 text-white px-3 py-1 rounded-full">
          Occupied: {filtered.filter(s => s.status === 'occupied').length}
        </span>
        <span className="bg-gray-500 text-white px-3 py-1 rounded-full">
          Vacant: {filtered.filter(s => s.status === 'vacant').length}
        </span>
        <span className="bg-red-700 text-white px-3 py-1 rounded-full">
          Delinquent: {filtered.filter(s => s.status === 'delinquent').length}
        </span>
      </div>

      {/* Table */}
      <div className="gov-card rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gov-navy text-white">
              <th className="text-left p-3 font-serif font-semibold whitespace-nowrap">Stall No.</th>
              <th className="text-left p-3 font-serif font-semibold whitespace-nowrap">Building</th>
              <th className="text-left p-3 font-serif font-semibold whitespace-nowrap">Category</th>
              <th className="text-left p-3 font-serif font-semibold whitespace-nowrap">Owner Name</th>
              <th className="text-left p-3 font-serif font-semibold whitespace-nowrap">Contact</th>
              <th className="text-right p-3 font-serif font-semibold whitespace-nowrap">Rental (₱)</th>
              <th className="text-right p-3 font-serif font-semibold whitespace-nowrap">Security Dep. (₱)</th>
              <th className="text-center p-3 font-serif font-semibold whitespace-nowrap">Status</th>
              <th className="text-center p-3 font-serif font-semibold whitespace-nowrap">Date Started</th>
              <th className="text-center p-3 font-serif font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-gov-gray font-mono italic">
                  No stalls found.
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gov-cream'}>
                  <td className="p-3 font-mono font-bold text-gov-navy">{s.stall_number}</td>
                  <td className="p-3 text-sm">{s.building_name || '—'}</td>
                  <td className="p-3 text-sm text-gov-gray">{s.category_name || '—'}</td>
                  <td className="p-3 font-sans">
                    {s.owner_name
                      ? <span className="font-semibold text-gov-navy">{s.owner_name}</span>
                      : <span className="italic text-gov-gray text-xs">Vacant</span>
                    }
                  </td>
                  <td className="p-3 font-mono text-xs text-gov-gray">{s.contact_number || '—'}</td>
                  <td className="p-3 font-mono text-right">
                    {s.rental_rate ? Number(s.rental_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="p-3 font-mono text-right">
                    {s.security_deposit ? Number(s.security_deposit).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`status-${s.status}`}>{s.status}</span>
                  </td>
                  <td className="p-3 font-mono text-xs text-gov-gray text-center">
                    {s.date_started ? new Date(s.date_started).toLocaleDateString('en-PH') : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      {/* 👁 View Summary Button */}
                      <button
                        onClick={() => openSummary(s)}
                        className="p-1.5 text-gov-blue hover:bg-blue-50 rounded"
                        title="View Summary"
                      >
                        <MdVisibility size={16} />
                      </button>

                      {canEdit && (
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 text-gov-gray hover:bg-gray-50 rounded" title="Edit">
                          <MdEdit size={16} />
                        </button>
                      )}
                      {isAdmin() && (
                        <button onClick={() => remove(s.id)}
                          className="p-1.5 text-gov-red hover:bg-red-50 rounded" title="Delete">
                          <MdDelete size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showModal && (
        <StallFormModal
          stall={editStall}
          buildings={buildings}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchData(); }}
        />
      )}

      {showSummary && summaryStall && (
        <StallSummaryModal
          stall={summaryStall}
          onClose={() => { setShowSummary(false); setSummaryStall(null); }}
        />
      )}
    </div>
  );
}