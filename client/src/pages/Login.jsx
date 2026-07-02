import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MdBadge, MdLogin, MdBusiness } from 'react-icons/md';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const { login }                   = useAuth();
  const navigate                    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId.trim()) return setError('Please enter your Employee ID.');
    setLoading(true); setError('');
    try {
      await login(employeeId.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Employee ID. Access denied.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gov-navy px-4 py-8">
      {/* Background circles — decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[80,160,240,320,400].map((size, i) => (
          <div key={i} className="absolute border border-white/5 rounded-full"
            style={{ width: size, height: size, top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)' }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-gov-gold rounded-full flex items-center justify-center mb-4 shadow-xl">
            <MdBusiness className="text-gov-navy text-4xl" />
          </div>
          <h1 className="font-serif text-white text-xl md:text-2xl font-bold leading-tight">
            Municipal Treasurer's Office
          </h1>
          <p className="text-gov-gold font-mono text-xs tracking-widest mt-1 uppercase">
            Stall Revenue Monitoring System
          </p>
          <div className="flex items-center gap-2 justify-center mt-3">
            <div className="h-px flex-1 bg-gov-gold/30" />
            <p className="text-white/40 font-mono text-xs">AUTHORIZED ACCESS ONLY</p>
            <div className="h-px flex-1 bg-gov-gold/30" />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-gov-paper rounded-lg shadow-2xl border border-gov-gold/30 overflow-hidden">
          <div className="bg-gov-cream p-3 border-b border-gov-border text-center">
            <p className="font-serif text-gov-navy font-bold text-sm">Staff Login Portal</p>
            <p className="text-gov-gray text-xs font-mono mt-0.5">Enter your Employee ID to access the system</p>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-300 rounded p-3">
                <p className="text-red-700 text-sm font-mono">{error}</p>
              </div>
            )}
            <div>
              <label className="gov-label flex items-center gap-2">
                <MdBadge /> Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="gov-input font-mono text-center text-base tracking-widest"
                placeholder="e.g. ADMIN-001"
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
              />
              <p className="text-gov-gray text-xs mt-1 font-mono text-center">
                No password required
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-gov-navy text-white py-3 rounded font-serif font-bold text-base hover:bg-gov-blue transition-colors shadow-md disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <><MdLogin className="text-xl" /> Access System</>
              )}
            </button>
          </form>
          <div className="p-3 bg-gov-navy/5 border-t border-gov-border text-center">
            <p className="text-gov-gray font-mono text-xs">
              Unauthorized access is prohibited and monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}