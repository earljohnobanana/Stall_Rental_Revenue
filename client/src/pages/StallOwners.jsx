import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdPerson, MdSearch, MdWarning, MdClose } from 'react-icons/md';
import api from '../services/api';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

export default function StallOwners() {
  const [owners, setOwners]         = useState([]);
  const [stalls, setStalls]         = useState([]);
  const [buildings, setBuildings]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editOwner, setEditOwner]   = useState(null);
  const [form, setForm]             = useState({ full_name: '', contact_number: '', address: '', stall_id: '' });
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError]           = useState('');
  const { isAdmin, isCashier }      = useAuth();
  const canEdit = isAdmin() || isCashier();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/owners'),
      api.get('/stalls'),
      api.get('/buildings'),
    ]).then(([o, s, b]) => {
      setOwners(o.data);
      setStalls(s.data);
      setBuildings(b.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // Filter by search AND building
  const filtered = owners.filter(o => {
    const matchSearch = !search ||
      o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.stall_number?.toLowerCase().includes(search.toLowerCase());

    const matchBuilding = !filterBuilding ||
      String(o.building_name) === buildings.find(b => String(b.id) === filterBuilding)?.name;

    return matchSearch && matchBuilding;
  });

  // Available stalls — vacant ones + currently assigned stall of owner being edited
  const availableStalls = stalls.filter(s =>
    s.status === 'vacant' || (editOwner && s.id === editOwner.stall_id)
  );

  const openAdd = () => {
    setForm({ full_name: '', contact_number: '', address: '', stall_id: '' });
    setEditOwner(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (o) => {
    setForm({
      full_name:      o.full_name,
      contact_number: o.contact_number || '',
      address:        o.address || '',
      stall_id:       o.stall_id || '',
    });
    setEditOwner(o);
    setError('');
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editOwner) await api.put(`/owners/${editOwner.id}`, form);
      else           await api.post('/owners', form);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving owner.');
    }
  };

  const confirmDelete = (o) => setDeleteModal(o);

  const executeDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/owners/${deleteModal.id}`);
      setDeleteModal(null);
      fetchData();
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'Error deleting owner.'));
    } finally { setDeleteLoading(false); }
  };

  if (loading) return <Loader message="Loading owners..." />;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="page-title">Stall Owners</h2>
        {canEdit && (
          <button onClick={openAdd} className="gov-btn-primary flex items-center gap-2">
            <MdAdd /> Add Owner
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="gov-card p-5 rounded-lg border-l-4 border-gov-gold">
          <h3 className="section-header">{editOwner ? 'Edit Stall Owner' : 'Register New Stall Owner'}</h3>
          {error && (
            <div className="bg-red-50 border border-red-300 rounded p-3 mb-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="gov-label">Full Name *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required className="gov-input" />
            </div>
            <div>
              <label className="gov-label">Contact Number</label>
              <input value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))}
                className="gov-input font-mono" />
            </div>
            <div className="col-span-2">
              <label className="gov-label">Address</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="gov-input" />
            </div>
            <div>
              <label className="gov-label">Assign Stall</label>
              <select value={form.stall_id} onChange={e => setForm(f => ({ ...f, stall_id: e.target.value }))}
                className="gov-input">
                <option value="">— Unassigned —</option>
                {availableStalls.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.stall_number} — {s.building_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" className="gov-btn-primary">Save Owner</button>
              <button type="button" onClick={() => setShowForm(false)} className="gov-btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Building Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <MdSearch className="text-gov-gray flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="gov-input"
            placeholder="Search by name or stall number..."
          />
        </div>

        {/* Building Dropdown Filter */}
        <select
          value={filterBuilding}
          onChange={e => setFilterBuilding(e.target.value)}
          className="gov-input w-48"
        >
          <option value="">All Buildings</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(search || filterBuilding) && (
          <button
            onClick={() => { setSearch(''); setFilterBuilding(''); }}
            className="gov-btn-secondary text-xs flex items-center gap-1"
          >
            <MdClose size={14} /> Clear
          </button>
        )}

        <span className="text-gov-gray font-mono text-xs">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          {filterBuilding && ` · ${buildings.find(b => String(b.id) === filterBuilding)?.name || ''}`}
        </span>
      </div>

      {/* Table */}
      <div className="gov-card rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gov-navy text-white">
              <th className="text-left p-3 font-serif font-semibold">#</th>
              <th className="text-left p-3 font-serif font-semibold">Full Name</th>
              <th className="text-left p-3 font-serif font-semibold">Stall No.</th>
              <th className="text-left p-3 font-serif font-semibold">Building</th>
              <th className="text-left p-3 font-serif font-semibold">Contact</th>
              <th className="text-left p-3 font-serif font-semibold">Address</th>
              {canEdit && <th className="text-center p-3 font-serif font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gov-gray font-mono italic">
                  {filterBuilding
                    ? `No owners found in ${buildings.find(b => String(b.id) === filterBuilding)?.name}.`
                    : 'No owners found.'
                  }
                </td>
              </tr>
            ) : (
              filtered.map((o, i) => (
                <tr key={o.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gov-cream'}>
                  <td className="p-3 font-mono text-gov-gray">{i + 1}</td>
                  <td className="p-3 font-serif font-bold text-gov-navy">
                    <div className="flex items-center gap-2">
                      <MdPerson className="text-gov-blue flex-shrink-0" />
                      {o.full_name}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-gov-blue font-bold">{o.stall_number || '—'}</td>
                  <td className="p-3 text-sm">{o.building_name || '—'}</td>
                  <td className="p-3 font-mono text-sm">{o.contact_number || '—'}</td>
                  <td className="p-3 text-sm text-gov-gray">{o.address || '—'}</td>
                  {canEdit && (
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(o)}
                          className="p-1.5 text-gov-blue hover:bg-blue-50 rounded" title="Edit">
                          <MdEdit />
                        </button>
                        {isAdmin() && (
                          <button onClick={() => confirmDelete(o)}
                            className="p-1.5 text-gov-red hover:bg-red-50 rounded" title="Delete">
                            <MdDelete />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="gov-card w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-gov-red">
              <MdWarning className="text-white text-2xl flex-shrink-0" />
              <h2 className="font-serif text-white font-bold">Confirm Delete</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-gov-navy font-sans text-sm">You are about to permanently delete:</p>
              <div className="bg-gov-cream border border-gov-border rounded p-3">
                <p className="font-serif font-bold text-gov-navy">{deleteModal.full_name}</p>
                {deleteModal.stall_number && (
                  <p className="text-gov-blue font-mono text-sm mt-1">
                    Stall: {deleteModal.stall_number} — {deleteModal.building_name}
                  </p>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-300 rounded p-3 flex gap-2">
                <MdWarning className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 text-xs font-sans leading-relaxed">
                  <strong>Warning:</strong> This will also delete all payment records linked to this owner
                  and set their stall back to Vacant.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDeleteModal(null)} disabled={deleteLoading} className="gov-btn-secondary">
                  Cancel
                </button>
                <button onClick={executeDelete} disabled={deleteLoading}
                  className="gov-btn-danger flex items-center gap-2">
                  {deleteLoading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                  ) : (
                    <><MdDelete /> Yes, Delete</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}