import { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdLock, MdPerson, MdWarning, MdClose } from 'react-icons/md';
import api from '../services/api';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['admin', 'cashier', 'staff'];

const roleColor = {
  admin:   'bg-gov-red text-white',
  cashier: 'bg-gov-blue text-white',
  staff:   'bg-gray-500 text-white',
};

export default function StaffManagement() {
  const [staff, setStaff]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editStaff, setEditStaff]   = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formError, setFormError]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    employee_id: '', full_name: '', role: 'staff', department: ''
  });
  const { user } = useAuth();

  const fetchStaff = () => {
    setLoading(true);
    api.get('/staff').then(r => setStaff(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const openAdd = () => {
    setForm({ employee_id: '', full_name: '', role: 'staff', department: '' });
    setEditStaff(null);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({ employee_id: s.employee_id, full_name: s.full_name, role: s.role, department: s.department || '' });
    setEditStaff(s);
    setFormError('');
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editStaff) {
        await api.put(`/staff/${editStaff.id}`, form);
        showSuccess(`"${form.full_name}" updated successfully.`);
      } else {
        await api.post('/staff', form);
        showSuccess(`Staff account "${form.employee_id}" created.`);
      }
      setShowForm(false);
      fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error saving staff account.');
    }
  };

  const confirmDelete = (s) => {
    if (String(s.id) === String(user?.id)) {
      alert('You cannot delete your own account.');
      return;
    }
    setDeleteModal(s);
  };

  const executeDelete = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/staff/${deleteModal.id}`);
      setDeleteModal(null);
      showSuccess(res.data.message || 'Staff account deleted.');
      fetchStaff();
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'Error deleting staff account.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <Loader message="Loading staff..." />;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Revenue Collector</h2>
          <p className="text-gov-gray text-xs font-mono mt-1 flex items-center gap-1">
            <MdLock className="text-gov-red" /> Admin-only section
          </p>
        </div>
        <button onClick={openAdd} className="gov-btn-primary flex items-center gap-2">
          <MdAdd /> Add Staff
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="bg-green-50 border border-green-300 rounded p-3 flex items-center justify-between">
          <p className="text-green-700 text-sm font-sans">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700">
            <MdClose />
          </button>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="gov-card p-5 rounded-lg border-l-4 border-gov-red shadow">
          <h3 className="section-header">{editStaff ? 'Edit Staff Account' : 'Create Staff Account'}</h3>
          {formError && (
            <div className="bg-red-50 border border-red-300 rounded p-3 mb-3">
              <p className="text-red-700 text-sm">{formError}</p>
            </div>
          )}
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="gov-label">Employee ID *</label>
              <input
                value={form.employee_id}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                required
                disabled={!!editStaff}
                className={`gov-input font-mono ${editStaff ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="e.g. ADMIN-002"
              />
              {editStaff && (
                <p className="text-gov-gray text-xs mt-1 font-mono">Employee ID cannot be changed.</p>
              )}
            </div>
            <div>
              <label className="gov-label">Full Name *</label>
              <input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
                className="gov-input"
                placeholder="e.g. Bernadette Obañana"
              />
            </div>
            <div>
              <label className="gov-label">Role *</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                required
                className="gov-input"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="gov-label">Department</label>
              <input
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="gov-input"
                placeholder="e.g. Collection Division"
              />
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" className="gov-btn-primary">
                {editStaff ? 'Update Account' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="gov-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Table */}
      <div className="gov-card rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gov-navy text-white">
              <th className="text-left p-3 font-serif font-semibold">Employee ID</th>
              <th className="text-left p-3 font-serif font-semibold">Full Name</th>
              <th className="text-left p-3 font-serif font-semibold">Role</th>
              <th className="text-left p-3 font-serif font-semibold">Department</th>
              <th className="text-center p-3 font-serif font-semibold">Status</th>
              <th className="text-center p-3 font-serif font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gov-gray font-mono italic">
                  No staff accounts found.
                </td>
              </tr>
            ) : (
              staff.map((s, i) => {
                const isCurrentUser = String(s.id) === String(user?.id);
                return (
                  <tr
                    key={s.id}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-gov-cream'} ${!s.is_active ? 'opacity-50' : ''}`}
                  >
                    <td className="p-3 font-mono font-bold text-gov-red">{s.employee_id}</td>
                    <td className="p-3 font-sans font-semibold flex items-center gap-2">
                      <MdPerson className="text-gov-blue flex-shrink-0" />
                      {s.full_name}
                      {isCurrentUser && (
                        <span className="text-xs font-mono text-gov-gray bg-gov-cream border border-gov-border px-1.5 py-0.5 rounded">you</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${roleColor[s.role] || 'bg-gray-400 text-white'}`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gov-gray">{s.department || '—'}</td>
                    <td className="p-3 text-center">
                      {s.is_active
                        ? <span className="status-occupied">Active</span>
                        : <span className="status-vacant">Inactive</span>
                      }
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-gov-blue hover:bg-blue-50 rounded"
                          title="Edit staff"
                        >
                          <MdEdit />
                        </button>
                        <button
                          onClick={() => confirmDelete(s)}
                          disabled={isCurrentUser}
                          className={`p-1.5 rounded transition-colors ${
                            isCurrentUser
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gov-red hover:bg-red-50'
                          }`}
                          title={isCurrentUser ? 'Cannot delete your own account' : 'Delete staff'}
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
              <h2 className="font-serif text-white font-bold">Delete Staff Account</h2>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-gov-navy font-sans text-sm">
                You are about to permanently delete this staff account:
              </p>

              <div className="bg-gov-cream border border-gov-border rounded p-3 space-y-1">
                <p className="font-serif font-bold text-gov-navy">{deleteModal.full_name}</p>
                <p className="font-mono text-gov-red text-sm">{deleteModal.employee_id}</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${roleColor[deleteModal.role]}`}>
                  {deleteModal.role}
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded p-3 flex gap-2">
                <MdWarning className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 text-xs font-sans leading-relaxed">
                  <strong>Warning:</strong> This will permanently remove the account.
                  The staff member will no longer be able to log in.
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={deleteLoading}
                  className="gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  disabled={deleteLoading}
                  className="gov-btn-danger flex items-center gap-2 min-w-[130px] justify-center"
                >
                  {deleteLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
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