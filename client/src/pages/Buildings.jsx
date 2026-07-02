import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdBusiness, MdStorefront, MdExpandMore, MdExpandLess, MdCheckCircle, MdCancel, MdWarning } from 'react-icons/md';
import api from '../services/api';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

export default function Buildings() {
  const [buildings, setBuildings] = useState([]);
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [expandedBuildings, setExpandedBuildings] = useState({});
  const [form, setForm] = useState({ name: '', description: '', location: '' });
  const [error, setError] = useState('');
  const { isAdmin, isCashier } = useAuth();
  const canEdit = isAdmin() || isCashier();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/buildings'),
      api.get('/stalls'),
    ]).then(([b, s]) => {
      setBuildings(b.data);
      setStalls(s.data);
      // Expand all buildings by default
      const expanded = {};
      b.data.forEach(b => expanded[b.id] = true);
      setExpandedBuildings(expanded);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // Group stalls by building_id
  const stallsByBuilding = stalls.reduce((acc, stall) => {
    const bid = stall.building_id;
    if (!acc[bid]) acc[bid] = [];
    acc[bid].push(stall);
    return acc;
  }, {});

  const toggleExpand = (id) => {
    setExpandedBuildings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openAdd = () => {
    setForm({ name: '', description: '', location: '' });
    setEditItem(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (b) => {
    setForm({ name: b.name, description: b.description || '', location: b.location || '' });
    setEditItem(b);
    setError('');
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editItem) await api.put(`/buildings/${editItem.id}`, form);
      else await api.post('/buildings', form);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving building.');
    }
  };

  const remove = async (id, stallCount) => {
    if (stallCount > 0) {
      alert(`Cannot delete: this building has ${stallCount} stall(s). Remove or reassign stalls first.`);
      return;
    }
    if (!confirm('Delete this building?')) return;
    try {
      await api.delete(`/buildings/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting building.');
    }
  };

  const statusIcon = (status) => {
    if (status === 'occupied')   return <MdCheckCircle className="text-green-600" />;
    if (status === 'delinquent') return <MdWarning className="text-amber-500" />;
    return <MdCancel className="text-gray-400" />;
  };

  const statusBadge = (status) => {
    if (status === 'occupied')   return 'status-occupied';
    if (status === 'delinquent') return 'status-delinquent';
    return 'status-vacant';
  };

  if (loading) return <Loader message="Loading buildings..." />;

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Building Management</h2>
          <p className="text-gov-gray font-mono text-xs mt-1">
            {buildings.length} building{buildings.length !== 1 ? 's' : ''} · {stalls.length} total stalls
          </p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="gov-btn-primary flex items-center gap-2">
            <MdAdd /> Add Building
          </button>
        )}
      </div>

      {/* Add / Edit Building Form */}
      {showForm && (
        <div className="gov-card p-5 rounded-lg border-l-4 border-gov-blue shadow">
          <h3 className="section-header">{editItem ? 'Edit Building' : 'New Building'}</h3>
          {error && (
            <div className="bg-red-50 border border-red-300 rounded p-3 mb-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={submit} className="grid grid-cols-3 gap-4">
            <div>
              <label className="gov-label">Building Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required className="gov-input"
                placeholder="e.g. Building A"
              />
            </div>
            <div>
              <label className="gov-label">Location</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="gov-input"
                placeholder="e.g. Ground Floor, North Wing"
              />
            </div>
            <div>
              <label className="gov-label">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="gov-input"
                placeholder="e.g. Food and beverages section"
              />
            </div>
            <div className="col-span-3 flex gap-3">
              <button type="submit" className="gov-btn-primary">Save Building</button>
              <button type="button" onClick={() => setShowForm(false)} className="gov-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Building Cards */}
      {buildings.length === 0 ? (
        <div className="gov-card p-10 rounded-lg text-center">
          <MdBusiness className="text-5xl text-gov-border mx-auto mb-3" />
          <p className="font-serif text-gov-gray text-lg">No buildings yet.</p>
          <p className="font-mono text-gov-gray text-xs mt-1">Click "Add Building" to get started.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {buildings.map((building, idx) => {
            const buildingStalls = stallsByBuilding[building.id] || [];
            const occupied   = buildingStalls.filter(s => s.status === 'occupied').length;
            const vacant     = buildingStalls.filter(s => s.status === 'vacant').length;
            const delinquent = buildingStalls.filter(s => s.status === 'delinquent').length;
            const isExpanded = expandedBuildings[building.id];

            return (
              <div key={building.id} className="gov-card rounded-lg overflow-hidden shadow-sm border border-gov-border">

                {/* Building Card Header */}
                <div className="bg-gov-navy px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gov-gold flex items-center justify-center flex-shrink-0">
                      <span className="font-serif text-gov-navy font-bold text-sm">{idx + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-serif text-white font-bold text-base leading-tight">
                        {building.name}
                      </h3>
                      <p className="text-white/50 font-mono text-xs mt-0.5">
                        {building.location || 'No location set'}
                        {building.description && ` · ${building.description}`}
                      </p>
                    </div>
                  </div>

                  {/* Stats + actions */}
                  <div className="flex items-center gap-4">
                    {/* Stall count badges */}
                    <div className="hidden md:flex items-center gap-2">
                      <span className="flex items-center gap-1 bg-green-700/80 text-white text-xs font-mono px-2 py-1 rounded-full">
                        <MdCheckCircle className="text-xs" /> {occupied}
                      </span>
                      <span className="flex items-center gap-1 bg-white/20 text-white text-xs font-mono px-2 py-1 rounded-full">
                        <MdCancel className="text-xs" /> {vacant}
                      </span>
                      {delinquent > 0 && (
                        <span className="flex items-center gap-1 bg-amber-500/80 text-white text-xs font-mono px-2 py-1 rounded-full">
                          <MdWarning className="text-xs" /> {delinquent}
                        </span>
                      )}
                      <span className="text-white/40 font-mono text-xs ml-1">
                        {buildingStalls.length} stall{buildingStalls.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Edit / Delete */}
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(building)}
                          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                          title="Edit building"
                        >
                          <MdEdit />
                        </button>
                        {isAdmin() && (
                          <button
                            onClick={() => remove(building.id, buildingStalls.length)}
                            className="p-1.5 text-red-300/60 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                            title="Delete building"
                          >
                            <MdDelete />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpand(building.id)}
                      className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
                    </button>
                  </div>
                </div>

                {/* Stalls Table — collapsible */}
                {isExpanded && (
                  <div>
                    {buildingStalls.length === 0 ? (
                      <div className="p-8 text-center bg-gov-cream/50">
                        <MdStorefront className="text-3xl text-gov-border mx-auto mb-2" />
                        <p className="font-mono text-gov-gray text-sm italic">No stalls in this building yet.</p>
                        <p className="font-mono text-gov-gray text-xs mt-1">Go to Stalls → Add Stall and assign it here.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gov-blue/10 border-b border-gov-border">
                            <th className="text-left px-4 py-2.5 font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide">Stall No.</th>
                            <th className="text-left px-4 py-2.5 font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide">Category</th>
                            <th className="text-left px-4 py-2.5 font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide">Owner</th>
                            <th className="text-right px-4 py-2.5 font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide">Rental (₱)</th>
                            <th className="text-right px-4 py-2.5 font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide">Security Deposit (₱)</th>
                            <th className="text-center px-4 py-2.5 font-serif font-semibold text-gov-navy text-xs uppercase tracking-wide">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buildingStalls.map((stall, si) => (
                            <tr
                              key={stall.id}
                              className={`border-b border-gov-border/50 hover:bg-blue-50/50 transition-colors ${si % 2 === 0 ? 'bg-white' : 'bg-gov-cream/40'}`}
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <MdStorefront className="text-gov-blue flex-shrink-0" />
                                  <span className="font-mono font-bold text-gov-navy">{stall.stall_number}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-gov-gray text-xs">{stall.category_name || '—'}</td>
                              <td className="px-4 py-2.5 font-sans">
                                {stall.owner_name
                                  ? <span className="text-gov-navy font-semibold">{stall.owner_name}</span>
                                  : <span className="text-gov-gray italic text-xs">Vacant</span>
                                }
                              </td>
                              <td className="px-4 py-2.5 font-mono text-right text-gov-navy">
                                {stall.rental_rate
                                  ? Number(stall.rental_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })
                                  : '—'
                                }
                              </td>
                              <td className="px-4 py-2.5 font-mono text-right text-gov-navy">
                                {stall.security_deposit
                                  ? Number(stall.security_deposit).toLocaleString('en-PH', { minimumFractionDigits: 2 })
                                  : '—'
                                }
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={statusBadge(stall.status)}>
                                  {stall.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>

                        {/* Building totals footer */}
                        <tfoot>
                          <tr className="bg-gov-navy/5 border-t-2 border-gov-border">
                            <td colSpan={3} className="px-4 py-2 font-serif text-gov-navy font-bold text-xs text-right">
                              BUILDING TOTALS:
                            </td>
                            <td className="px-4 py-2 font-mono text-right text-gov-navy font-bold text-xs">
                              {buildingStalls.reduce((s, st) => s + Number(st.rental_rate || 0), 0)
                                .toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 font-mono text-right text-gov-navy font-bold text-xs">
                              {buildingStalls.reduce((s, st) => s + Number(st.security_deposit || 0), 0)
                                .toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}

                    {/* Building summary bar */}
                    <div className="bg-gov-cream border-t border-gov-border px-5 py-2.5 flex flex-wrap items-center gap-4 text-xs font-mono">
                      <span className="text-gov-gray">Summary:</span>
                      <span className="text-green-700 font-bold">{occupied} Occupied</span>
                      <span className="text-gov-gray">{vacant} Vacant</span>
                      {delinquent > 0 && <span className="text-amber-600 font-bold">{delinquent} Delinquent</span>}
                      <span className="text-gov-gray ml-auto">
                        Total Monthly: ₱{buildingStalls
                          .reduce((s, st) => s + Number(st.rental_rate || 0) + Number(st.security_deposit || 0), 0)
                          .toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}