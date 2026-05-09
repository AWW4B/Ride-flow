'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

const VEHICLE_TYPES = [
  { key: 'economy', label: 'Economy', icon: '🚗' },
  { key: 'premium', label: 'Premium', icon: '🏎️' },
  { key: 'bike',    label: 'Bike',    icon: '🏍️' },
];

const EMPTY = { make: '', model: '', year: new Date().getFullYear(), color: '', license_plate: '', vehicle_type: 'economy' };

export default function DriverVehiclePage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [profile,  setProfile]  = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [loading,  setLoading]  = useState(true);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [v, p] = await Promise.all([api.driver.getVehicles(), api.driver.getProfile()]);
      setVehicles(v);
      setProfile(p);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.driver.registerVehicle(form);
      showToast('Vehicle registered — pending admin verification');
      setShowForm(false);
      setForm({ ...EMPTY });
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const verificationBadge = (s: string) => {
    const map: Record<string, string> = { verified: 'success', rejected: 'error', pending: 'warn' };
    return <span className={`badge badge-${map[s] ?? 'muted'}`} style={{ textTransform: 'capitalize' }}>{s}</span>;
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: 'var(--success-fg)', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 9999 }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">My Vehicle</div>
          <div className="page-subtitle">Registered vehicles &amp; verification status</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setError(''); }}>
          + Register Vehicle
        </button>
      </div>

      {/* Driver status card */}
      {profile && (
        <div className="card mb-16">
          <div className="card-title">Driver Status</div>
          <div className="metric-row"><span className="metric-key">Name</span><span className="metric-val">{profile.full_name}</span></div>
          <div className="metric-row"><span className="metric-key">City</span><span className="metric-val">{profile.city ?? '—'}</span></div>
          <div className="metric-row"><span className="metric-key">License No.</span><span className="metric-val mono">{profile.license_number}</span></div>
          <div className="metric-row">
            <span className="metric-key">Verification</span>
            {verificationBadge(profile.verification_status)}
          </div>
          {profile.verification_status !== 'verified' && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(196,169,109,0.07)', borderRadius: 8, border: '1px solid rgba(196,169,109,0.2)', fontSize: 12, color: 'var(--text-m)' }}>
              ⚠️ Your account is <strong>{profile.verification_status}</strong>. Admin must verify your driver profile before you can accept rides.
            </div>
          )}
        </div>
      )}

      {/* Vehicle list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-m)' }}>Loading vehicles…</div>
      ) : vehicles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <p>No vehicle registered yet.</p>
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-m)' }}>Register a vehicle to start accepting rides.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vehicles.map(v => (
            <div key={v.vehicle_id} className="card" style={{ border: v.is_primary ? '1px solid rgba(196,169,109,0.35)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{v.make} {v.model} <span style={{ color: 'var(--text-m)', fontWeight: 400 }}>({v.year})</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-m)', marginTop: 2 }}>{v.color} · {v.license_plate}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {v.is_primary ? <span className="badge badge-accent">Primary</span> : null}
                  {verificationBadge(v.verification_status)}
                </div>
              </div>
              <div className="divider" />
              <div className="metric-row"><span className="metric-key">Type</span><span className="metric-val" style={{ textTransform: 'capitalize' }}>{v.vehicle_type}</span></div>
              {v.verification_status !== 'verified' && (
                <div style={{ fontSize: 11, color: 'var(--warn-fg)', marginTop: 6 }}>
                  ⚠️ Pending admin verification — cannot be used for rides until verified
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Register Vehicle Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 440, maxWidth: '95vw' }}>
            <div className="card-title">Register a Vehicle</div>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Make</label>
                  <input className="input" value={form.make} onChange={e => set('make', e.target.value)} placeholder="Toyota" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input className="input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Corolla" required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input className="input" type="number" min={1980} max={2100} value={form.year} onChange={e => set('year', +e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input className="input" value={form.color} onChange={e => set('color', e.target.value)} placeholder="White" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">License Plate</label>
                <input className="input" value={form.license_plate} onChange={e => set('license_plate', e.target.value.toUpperCase())} placeholder="LHR-1234" required />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select className="input" value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}>
                  {VEHICLE_TYPES.map(t => (
                    <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              {error && <div style={{ color: 'var(--danger)', fontSize: 12, padding: '6px 10px', background: 'rgba(200,60,60,0.1)', borderRadius: 6 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Registering…' : 'Register Vehicle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
