'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

interface Promo {
  promo_id:      number;
  code:          string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  valid_from:    string;
  valid_to:      string;
  usage_limit:   number | null;
  times_used:    number;
}

const EMPTY_PROMO: Omit<Promo, 'promo_id' | 'times_used'> = {
  code: '', discount_type: 'percentage', discount_value: 10,
  valid_from: '', valid_to: '', usage_limit: null,
};

const FARE_CONFIG = [
  { type:'Economy',  base:80,  perKm:25, perMin:3.00 },
  { type:'Premium',  base:150, perKm:45, perMin:5.00 },
  { type:'Bike',     base:40,  perKm:12, perMin:1.50 },
];

const SURGE_RULES = [
  { label:'Morning Peak',  from:'08:00', to:'10:00', days:'Mon–Fri', multiplier:1.50 },
  { label:'Evening Peak',  from:'17:00', to:'20:00', days:'Mon–Fri', multiplier:1.40 },
  { label:'Weekend Night', from:'22:00', to:'23:59', days:'Sat–Sun', multiplier:1.30 },
];

export default function SettingsPage() {
  const [promos,    setPromos]    = useState<Promo[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<Promo | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_PROMO });
  const [saving,    setSaving]    = useState(false);
  const [actionId,  setActionId]  = useState<number | null>(null);
  const [error,     setError]     = useState('');
  const [toast,     setToast]     = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { setPromos(await api.admin.getPromos()); }
    catch { setError('Failed to load promo codes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_PROMO }); setShowForm(true); setError(''); };
  const openEdit   = (p: Promo) => {
    setEditing(p);
    setForm({
      code: p.code, discount_type: p.discount_type,
      discount_value: p.discount_value,
      valid_from: p.valid_from?.slice(0,10) ?? '',
      valid_to:   p.valid_to?.slice(0,10) ?? '',
      usage_limit: p.usage_limit,
    });
    setShowForm(true);
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.admin.updatePromo(editing.promo_id, form);
        showToast('Promo updated ✓');
      } else {
        await api.admin.createPromo(form);
        showToast('Promo created ✓');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
    } finally { setSaving(false); }
  };

  const del = async (id: number, code: string) => {
    if (!confirm(`Delete promo "${code}"?`)) return;
    setActionId(id);
    try { await api.admin.deletePromo(id); showToast(`Promo ${code} deleted`); await load(); }
    catch (err: any) { alert(err.message); }
    finally { setActionId(null); }
  };

  const today    = new Date().toISOString().slice(0, 10);
  const isActive = (p: Promo) => p.valid_from <= today && today <= p.valid_to &&
    (p.usage_limit === null || p.times_used < p.usage_limit);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, background:'var(--success-fg)', color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, zIndex:9999 }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Platform configuration, fare rules, promo codes &amp; surge pricing</div>
        </div>
      </div>

      <div className="grid-2 mb-16">
        {/* Fare Config */}
        <div className="card">
          <div className="card-title">Fare Configuration</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Vehicle Type</th><th>Base Rate</th><th>Per KM</th><th>Per Min</th></tr>
              </thead>
              <tbody>
                {FARE_CONFIG.map(fc=>(
                  <tr key={fc.type}>
                    <td style={{ fontWeight:500 }}>{fc.type}</td>
                    <td style={{ color:'var(--accent)' }}>₨{fc.base}</td>
                    <td className="muted">₨{fc.perKm}</td>
                    <td className="muted">₨{fc.perMin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divider" />
          <div className="metric-row">
            <span className="metric-key">Platform Commission</span>
            <span className="metric-val accent">20.00%</span>
          </div>
        </div>

        {/* Surge Rules */}
        <div className="card">
          <div className="card-title">Surge Pricing Rules</div>
          {SURGE_RULES.map((s,i)=>(
            <div key={i} className="metric-row" style={{ flexDirection:'column', alignItems:'flex-start', gap:4, padding:'10px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                <div style={{ fontWeight:500, fontSize:13 }}>{s.label}</div>
                <span className="badge badge-warn">×{s.multiplier}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text-m)' }}>{s.from} – {s.to} · {s.days}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo Codes — live data */}
      <div className="card mb-16">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Promo Codes</div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Promo</button>
        </div>

        {error && !showForm && (
          <div style={{ marginBottom:12, color:'var(--danger)', background:'rgba(200,60,60,0.1)', padding:'8px 14px', borderRadius:8, fontSize:13 }}>{error}</div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading promo codes…</div>
          ) : promos.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏷️</div><p>No promo codes yet.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Type</th><th>Value</th><th>Valid</th>
                  <th>Usage</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p.promo_id}>
                    <td><span className="badge badge-accent">{p.code}</span></td>
                    <td><span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{p.discount_type}</span></td>
                    <td style={{ color:'var(--accent)', fontWeight:500 }}>
                      {p.discount_type==='percentage' ? `${p.discount_value}%` : `₨${p.discount_value}`}
                    </td>
                    <td className="muted" style={{ fontSize:11 }}>{p.valid_from?.slice(0,10)} → {p.valid_to?.slice(0,10)}</td>
                    <td>{p.times_used} / {p.usage_limit ?? '∞'}</td>
                    <td>
                      {isActive(p)
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-muted">Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                          disabled={actionId === p.promo_id}
                          onClick={() => del(p.promo_id, p.code)}>
                          {actionId === p.promo_id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Role-based Access */}
      <div className="card">
        <div className="card-title">Role-Based Access Control (DCL)</div>
        <div className="grid-3">
          {[
            { role:'Admin (rf_admin)', perms:['ALL on rideflow.*'], color:'var(--accent)' },
            { role:'Rider (rf_rider)', perms:['SELECT, INSERT on Ride_Request','SELECT, INSERT on Payment','SELECT, INSERT on Rating','SELECT on Ride, Ride_History, Driver, Vehicle'], color:'var(--info-fg)' },
            { role:'Driver (rf_driver)', perms:['SELECT, UPDATE on Driver','SELECT, UPDATE on Driver_Notification','SELECT on Ride, Ride_History, Driver_Earnings','SELECT, INSERT on Payout_Request, Rating'], color:'var(--success-fg)' },
          ].map(r=>(
            <div key={r.role} style={{ background:'var(--bg-s2)', borderRadius:8, padding:14, border:'1px solid var(--border)' }}>
              <div style={{ fontWeight:600, color:r.color, marginBottom:10, fontSize:13 }}>{r.role}</div>
              {r.perms.map((p,i)=>(
                <div key={i} style={{ fontSize:11, color:'var(--text-m)', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                  {p}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div className="card" style={{ width:420, maxWidth:'95vw' }}>
            <div className="card-title">{editing ? 'Edit Promo Code' : 'New Promo Code'}</div>
            <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Code</label>
                <input className="input" value={form.code} onChange={e => setForm(f=>({...f, code:e.target.value.toUpperCase()}))} placeholder="WELCOME10" required />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="input" value={form.discount_type} onChange={e => setForm(f=>({...f, discount_type: e.target.value as any}))}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₨)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Value {form.discount_type==='percentage' ? '(0-100%)' : '(₨)'}</label>
                  <input className="input" type="number" min="0.01" max={form.discount_type==='percentage'?100:undefined} step="0.01"
                    value={form.discount_value} onChange={e => setForm(f=>({...f, discount_value:+e.target.value}))} required />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="form-group">
                  <label className="form-label">Valid From</label>
                  <input className="input" type="date" value={form.valid_from} onChange={e => setForm(f=>({...f, valid_from:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Valid To</label>
                  <input className="input" type="date" value={form.valid_to} onChange={e => setForm(f=>({...f, valid_to:e.target.value}))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Usage Limit <span style={{color:'var(--text-m)',fontWeight:400}}>(blank = unlimited)</span></label>
                <input className="input" type="number" min="1" placeholder="e.g. 500" value={form.usage_limit ?? ''}
                  onChange={e => setForm(f=>({...f, usage_limit: e.target.value ? +e.target.value : null}))} />
              </div>
              {error && <div style={{ color:'var(--danger)', fontSize:12, padding:'6px 10px', background:'rgba(200,60,60,0.1)', borderRadius:6 }}>{error}</div>}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editing ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
