'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function RidersPage() {
  const [riders,    setRiders]    = useState<any[]>([]);
  const [flagged,   setFlagged]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionId,  setActionId]  = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [all, flag] = await Promise.all([
        api.admin.getUsers('rider'),
        api.admin.getFlaggedRiders(),
      ]);
      setRiders(all);
      setFlagged(flag);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = riders.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.full_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || r.account_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total     = riders.length;
  const active    = riders.filter(r => r.account_status === 'active').length;
  const suspended = riders.filter(r => r.account_status === 'suspended').length;

  const handleStatus = async (userId: number, status: string) => {
    setActionId(userId);
    try { await api.admin.updateUserStatus(userId, status); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setActionId(null); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string,string> = { active:'success', suspended:'warn', banned:'error' };
    return <span className={`badge badge-${map[s] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{s}</span>;
  };

  const exportCSV = () => {
    const cols = ['user_id','full_name','email','account_status','registered_at'];
    const rows = filtered.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(','));
    const csv  = [cols.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = `riders_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Riders</div>
          <div className="page-subtitle">Rider accounts, spending stats & flags</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      {/* KPIs */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">🧍</span>
          <div className="stat-label">Total Riders</div>
          <div className="stat-value">{total}</div>
          <div className="stat-meta">{active} active accounts</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🚩</span>
          <div className="stat-label">Flagged Riders</div>
          <div className="stat-value" style={{ color:'var(--danger-fg)' }}>{flagged.length}</div>
          <div className="stat-meta">rating below 3.0</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔴</span>
          <div className="stat-label">Suspended</div>
          <div className="stat-value" style={{ color:'var(--warn-fg)' }}>{suspended}</div>
          <div className="stat-meta">need admin review</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Active Rate</div>
          <div className="stat-value accent">{total > 0 ? Math.round((active / total) * 100) : 0}%</div>
          <div className="stat-meta">of all registered riders</div>
        </div>
      </div>

      {/* Flagged alert */}
      {flagged.length > 0 && (
        <div className="mb-16" style={{ background:'var(--danger-bg)', border:'1px solid rgba(180,70,60,0.25)', borderRadius:8, padding:'12px 14px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--danger-fg)', marginBottom:6 }}>⚠ Auto-flagged Riders — Rating Below 3.0</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {flagged.map(r => (
              <div key={r.rider_id} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(180,70,60,0.08)', border:'1px solid rgba(180,70,60,0.2)', borderRadius:6, padding:'4px 10px' }}>
                <span style={{ fontSize:12, color:'var(--text-p)' }}>{r.full_name}</span>
                <span style={{ fontSize:11, color:'var(--danger-fg)' }}>★ {Number(r.avg_rating ?? 0).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <input className="input" placeholder="Search rider name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading riders…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🧍</div><p>No riders found.</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>#</th><th>Rider</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.user_id}>
                    <td className="mono">U-{r.user_id}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="avatar">{r.full_name?.[0] ?? '?'}</div>
                        <div>
                          <div style={{ fontWeight:500, fontSize:13 }}>{r.full_name}</div>
                          <div style={{ fontSize:11, color:'var(--text-m)' }}>{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize:11 }}>{r.registered_at?.slice(0,10) ?? '—'}</td>
                    <td>{statusBadge(r.account_status)}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        {r.account_status === 'active'
                          ? <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                              disabled={actionId === r.user_id}
                              onClick={() => handleStatus(r.user_id, 'suspended')}>Suspend</button>
                          : <button className="btn btn-ghost btn-sm"
                              disabled={actionId === r.user_id}
                              onClick={() => handleStatus(r.user_id, 'active')}>Restore</button>
                        }
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
