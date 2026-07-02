import { useState, useEffect } from 'react';
import { MdSave, MdAdd, MdDelete } from 'react-icons/md';
import api from '../services/api';

export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/stall-categories').then(r => setCategories(r.data));
  }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    await api.post('/stall-categories', { name: newCat });
    setNewCat('');
    api.get('/stall-categories').then(r => setCategories(r.data));
    setMsg('Category added!');
    setTimeout(() => setMsg(''), 3000);
  };

  const deleteCategory = async (id) => {
    await api.delete(`/stall-categories/${id}`);
    setCategories(cats => cats.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="page-title">System Settings</h2>

      <div className="gov-card p-5 rounded-lg">
        <h3 className="section-header">Stall Categories</h3>
        <form onSubmit={addCategory} className="flex gap-3 mb-4">
          <input value={newCat} onChange={e => setNewCat(e.target.value)} className="gov-input" placeholder="New category name..." />
          <button type="submit" className="gov-btn-primary flex items-center gap-2"><MdAdd /> Add</button>
        </form>
        {msg && <p className="text-green-600 text-sm mb-3">{msg}</p>}
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between p-2 bg-gov-cream border border-gov-border rounded">
              <span className="font-sans text-sm">{c.name}</span>
              <button onClick={() => deleteCategory(c.id)} className="text-gov-red p-1 hover:bg-red-50 rounded"><MdDelete /></button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-gov-gray font-mono text-sm italic">No categories yet.</p>}
        </div>
      </div>

      <div className="gov-card p-5 rounded-lg">
        <h3 className="section-header">System Information</h3>
        <div className="space-y-2 font-mono text-sm text-gov-gray">
          <div className="flex justify-between border-b border-gov-border pb-2"><span>System:</span><span className="text-gov-navy font-bold">SRMS v1.0.0</span></div>
          <div className="flex justify-between border-b border-gov-border pb-2"><span>Office:</span><span className="text-gov-navy">Municipal Treasurer's Office</span></div>
          <div className="flex justify-between border-b border-gov-border pb-2"><span>Database:</span><span className="text-green-600">MySQL Connected</span></div>
          <div className="flex justify-between"><span>Environment:</span><span className="text-gov-navy">Production</span></div>
        </div>
      </div>
    </div>
  );
}
