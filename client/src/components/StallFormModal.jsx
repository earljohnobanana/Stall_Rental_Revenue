import { useState, useEffect } from 'react';
import { MdClose, MdPerson, MdStorefront, MdHistory, MdWarning } from 'react-icons/md';
import api from '../services/api';

export default function StallFormModal({ stall, buildings, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    stall_number: '', building_id: '', category_id: '',
    rental_rate: '', security_deposit: '', status: 'vacant', date_started: '',
    owner_name: '', contact_number: '', address: '',
  });
  const [transferForm, setTransferForm] = useState({
    transfer_date:    new Date().toISOString().split('T')[0],
    transfer_remarks: 'Contract ended / Stall transferred',
  });
  const [history, setHistory]           = useState([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [isTransfer, setIsTransfer]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [successMsg, setSuccessMsg]     = useState('');

  const originalOwner = stall?.owner_name || '';

  useEffect(() => {
    if (stall) {
      setForm({
        stall_number:     stall.stall_number     || '',
        building_id:      stall.building_id      || '',
        category_id:      stall.category_id      || '',
        rental_rate:      stall.rental_rate      || '',
        security_deposit: stall.security_deposit || '',
        status:           stall.status           || 'vacant',
        date_started:     stall.date_started?.split('T')[0] || '',
        owner_name:       stall.owner_name       || '',
        contact_number:   stall.contact_number   || '',
        address:          stall.address          || '',
      });
      // Load history
      api.get(`/stalls/${stall.id}/history`)
        .then(r => setHistory(r.data))
        .catch(() => {});
    }
  }, [stall]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };
      if (name === 'owner_name') {
        // Detect if owner changed (transfer)
        const changed = value.trim() && originalOwner &&
          value.trim().toLowerCase() !== originalOwner.toLowerCase();
        setIsTransfer(!!changed);
        if (value.trim()) updated.status = 'occupied';
        else updated.status = 'vacant';
      }
      return updated;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const payload = {
        ...form,
        ...(isTransfer ? transferForm : {}),
      };
      if (stall?.id) await api.put(`/stalls/${stall.id}`, payload);
      else           await api.post('/stalls', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving stall.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="gov-card w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gov-navy flex-shrink-0">
          <h2 className="font-serif text-white font-bold">
            {stall ? 'Edit Stall & Owner' : 'Add New Stall & Owner'}
          </h2>
          <div className="flex items-center gap-2">
            {stall && history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(h => !h)}
                className="flex items-center gap-1.5 text-gov-gold hover:text-white text-xs font-mono border border-gov-gold/40 rounded px-2 py-1 transition-colors"
              >
                <MdHistory size={14} />
                History ({history.length})
              </button>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <MdClose size={22} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* History Panel */}
          {showHistory && history.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 p-4">
              <h4 className="font-serif font-bold text-gov-navy text-sm mb-3 flex items-center gap-2">
                <MdHistory className="text-amber-600" /> Past Owners — Stall {stall?.stall_number}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={h.id} className="bg-white border border-amber-200 rounded p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-serif font-bold text-gov-navy">{h.owner_name}</p>
                        {h.contact_number && (
                          <p className="font-mono text-gov-gray mt-0.5">{h.contact_number}</p>
                        )}
                        {h.address && (
                          <p className="text-gov-gray mt-0.5">{h.address}</p>
                        )}
                        <p className="font-mono text-gov-blue mt-1">
                          Rental: ₱{Number(h.rental_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {h.date_started && (
                          <p className="text-gov-gray">
                            From: {new Date(h.date_started).toLocaleDateString('en-PH')}
                          </p>
                        )}
                        <p className="text-gov-red font-semibold">
                          Ended: {new Date(h.date_ended).toLocaleDateString('en-PH')}
                        </p>
                        {h.remarks && (
                          <p className="text-gov-gray italic mt-1">{h.remarks}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="p-5 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-300 rounded p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* STALL INFORMATION */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdStorefront className="text-gov-blue text-lg" />
                <h3 className="font-serif font-bold text-gov-navy text-sm uppercase tracking-wide">
                  Stall Information
                </h3>
                <div className="flex-1 h-px bg-gov-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="gov-label">Stall Number *</label>
                  <input name="stall_number" value={form.stall_number} onChange={handle}
                    required className="gov-input font-mono" placeholder="e.g. FS-001" />
                </div>
                <div>
                  <label className="gov-label">Building *</label>
                  <select name="building_id" value={form.building_id} onChange={handle}
                    required className="gov-input">
                    <option value="">Select Building</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gov-label">Category</label>
                  <select name="category_id" value={form.category_id} onChange={handle}
                    className="gov-input">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gov-label">Status *</label>
                  <select name="status" value={form.status} onChange={handle}
                    required className="gov-input">
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="delinquent">Delinquent</option>
                  </select>
                </div>
                <div>
                  <label className="gov-label">Rental Rate (₱)</label>
                  <input type="number" step="0.01" min="0" name="rental_rate"
                    value={form.rental_rate} onChange={handle}
                    className="gov-input font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="gov-label">Security Deposit (₱)</label>
                  <input type="number" step="0.01" min="0" name="security_deposit"
                    value={form.security_deposit} onChange={handle}
                    className="gov-input font-mono" placeholder="0.00" />
                </div>
                <div className="col-span-2">
                  <label className="gov-label">Date Started</label>
                  <input type="date" name="date_started" value={form.date_started}
                    onChange={handle} className="gov-input" />
                </div>
              </div>
            </div>

            {/* OWNER INFORMATION */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdPerson className="text-gov-gold text-lg" />
                <h3 className="font-serif font-bold text-gov-navy text-sm uppercase tracking-wide">
                  Stall Owner
                </h3>
                <div className="flex-1 h-px bg-gov-border" />
                <span className="text-gov-gray font-mono text-xs">optional if vacant</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="gov-label">Owner Full Name</label>
                  <input name="owner_name" value={form.owner_name} onChange={handle}
                    className="gov-input" placeholder="Leave blank if stall is vacant" />

                  {/* Status indicators */}
                  {form.owner_name.trim() && !isTransfer && (
                    <p className="text-green-600 text-xs mt-1 font-mono">
                      ✓ Status will be set to Occupied
                    </p>
                  )}
                  {isTransfer && (
                    <p className="text-amber-600 text-xs mt-1 font-mono flex items-center gap-1">
                      <MdWarning size={12} />
                      Owner change detected — previous owner ({originalOwner}) will be archived
                    </p>
                  )}
                </div>
                <div>
                  <label className="gov-label">Contact Number</label>
                  <input name="contact_number" value={form.contact_number} onChange={handle}
                    className="gov-input font-mono" placeholder="e.g. 09171234567" />
                </div>
                <div>
                  <label className="gov-label">Address</label>
                  <input name="address" value={form.address} onChange={handle}
                    className="gov-input" placeholder="e.g. Sta. Catalina" />
                </div>
              </div>
            </div>

            {/* TRANSFER DETAILS — shows when owner changes */}
            {isTransfer && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
                <h4 className="font-serif font-bold text-amber-800 text-sm flex items-center gap-2">
                  <MdHistory /> Transfer / Contract End Details
                </h4>
                <p className="text-amber-700 text-xs font-sans">
                  The previous owner <strong>{originalOwner}</strong> will be moved to history records.
                  Fill in the transfer details below.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="gov-label">Date Contract Ended *</label>
                    <input
                      type="date"
                      value={transferForm.transfer_date}
                      onChange={e => setTransferForm(f => ({ ...f, transfer_date: e.target.value }))}
                      className="gov-input"
                    />
                  </div>
                  <div>
                    <label className="gov-label">Reason / Remarks</label>
                    <input
                      value={transferForm.transfer_remarks}
                      onChange={e => setTransferForm(f => ({ ...f, transfer_remarks: e.target.value }))}
                      className="gov-input"
                      placeholder="e.g. Contract expired, Voluntary surrender"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-blue-800 text-xs font-sans">
                <strong>Note:</strong> Electric fees are recorded per payment transaction
                since actual usage varies each month.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="gov-btn-secondary">Cancel</button>
              <button type="submit" disabled={loading} className="gov-btn-primary min-w-[160px]">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : isTransfer ? '✓ Transfer & Save' : stall ? 'Update Stall & Owner' : 'Save Stall & Owner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}