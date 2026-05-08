'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

interface Promo {
  promo_id:      number;
  code:          string;
  discount_type: 'percentage' | 'flat';
  discount_value:number;
  valid_from:    string;
  valid_to:      string;
  usage_limit:   number | null;
  times_used:    number;
}

const EMPTY: Omit<Promo, 'promo_id' | 'times_used'> = {
  code: '', discount_type: 'percentage', discount_value: 10,
  valid_from: '', valid_to: '', usage_limit: null,
};

export default function PromosPage() {
  const [promos, setPromos]     = useState<Promo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Promo | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = async () => {
    setLoading(true);
    try { setPromos(await api.admin.getPromos()); }
    catch { setError('Failed to load promo codes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); setError(''); };
  const openEdit   = (p: Promo) => {
    setEditing(p);
    setForm({
      code: p.code, discount_type: p.discount_type,
      discount_value: p.discount_value,
      valid_from: p.valid_from.slice(0,10),
      valid_to:   p.valid_to.slice(0,10),
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
      } else {
        await api.admin.createPromo(form);
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
    } finally { setSaving(false); }
  };

  const del = async (id: number, code: string) => {
    if (!confirm(`Delete promo "${code}"?`)) return;
    try { await api.admin.deletePromo(id); await load(); }
    catch (err: any) { alert(err.message); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const isActive = (p: Promo) => p.valid_from <= today && today <= p.valid_to &&
    (p.usage_limit === null || p.times_used < p.usage_limit);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Promo Codes</div>
          <div className="page-subtitle">Create and manage discount codes for riders</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Promo</button>
      </div>

      {error && !showForm && (
        <div style={{ marginBottom:16, color:'var(--danger)', background:'rgba(200,60,60,0.1)', padding:'10px 14px', borderRadius:8, fontSize:13 }}>{error}</div>
      )}

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

      {/* Promo Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading promo codes…</div>
          ) : promos.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏷️</div><p>No promo codes yet.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Type</th><th>Value</th><th>Valid From</th>
                  <th>Valid To</th><th>Used / Limit</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p.promo_id}>
                    <td><span className="mono" style={{ fontWeight:600, color:'var(--accent)', fontSize:13 }}>{p.code}</span></td>
                    <td>{p.discount_type === 'percentage' ? 'Percentage' : 'Flat'}</td>
                    <td className="metric-val">{p.discount_type === 'percentage' ? `${p.discount_value}%` : `₨${p.discount_value}`}</td>
                    <td className="muted">{p.valid_from?.slice(0,10)}</td>
                    <td className="muted">{p.valid_to?.slice(0,10)}</td>
                    <td>{p.times_used} / {p.usage_limit ?? '∞'}</td>
                    <td>
                      {isActive(p)
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-muted">Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => del(p.promo_id, p.code)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
