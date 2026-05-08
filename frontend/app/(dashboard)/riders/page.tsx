'use client';
import { useState } from 'react';
import { mockRiders } from '@/utils/mockData';
import { getAccountStatusBadge, formatCurrency, formatDate, renderStars } from '@/utils/helpers';

export default function RidersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = mockRiders.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || r.account_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const flagged = mockRiders.filter(r => r.avg_rating > 0 && r.avg_rating < 3.0);
  const suspended = mockRiders.filter(r => r.account_status === 'suspended');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Riders</div>
          <div className="page-subtitle">Rider accounts, spending stats & flags</div>
        </div>
        <button className="btn btn-primary">+ Add Rider</button>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">🧍</span>
          <div className="stat-label">Total Riders</div>
          <div className="stat-value">{mockRiders.length}</div>
          <div className="stat-meta">{mockRiders.filter(r=>r.account_status==='active').length} active accounts</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💸</span>
          <div className="stat-label">Total Platform Spend</div>
          <div className="stat-value accent">₨{formatCurrency(mockRiders.reduce((s,r)=>s+r.total_spent,0))}</div>
          <div className="stat-meta">cumulative all riders</div>
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
          <div className="stat-value" style={{ color:'var(--warn-fg)' }}>{suspended.length}</div>
          <div className="stat-meta">need admin review</div>
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
                <span style={{ fontSize:11, color:'var(--danger-fg)' }}>★ {r.avg_rating.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <input className="input" placeholder="Search rider name or email…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <button className="btn btn-ghost btn-sm">Export CSV</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Rider</th><th>Phone</th><th>Rating</th><th>Total Rides</th><th>Total Spent</th><th>Cancellations</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.rider_id}>
                  <td className="mono">R-{r.rider_id}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="avatar">{r.full_name[0]}</div>
                      <div>
                        <div style={{ fontWeight:500, fontSize:13 }}>{r.full_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-m)' }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{r.phone ?? '—'}</td>
                  <td>
                    {r.avg_rating > 0 ? (
                      <div>
                        <div>{renderStars(Math.round(r.avg_rating))}</div>
                        <div style={{ fontSize:11, color:'var(--text-m)' }}>{r.avg_rating.toFixed(1)}</div>
                      </div>
                    ) : <span style={{ color:'var(--text-m)' }}>—</span>}
                  </td>
                  <td style={{ fontWeight:500 }}>{r.total_rides}</td>
                  <td style={{ color:'var(--accent)', fontWeight:500 }}>₨{formatCurrency(r.total_spent)}</td>
                  <td>
                    {r.cancelled_rides > 0
                      ? <span className="badge badge-danger">{r.cancelled_rides}</span>
                      : <span style={{ color:'var(--text-m)' }}>0</span>}
                  </td>
                  <td className="muted">{formatDate(r.registered_at)}</td>
                  <td>{getAccountStatusBadge(r.account_status)}</td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-ghost btn-sm">View</button>
                      {r.account_status === 'suspended' && <button className="btn btn-primary btn-sm">Reinstate</button>}
                      {r.account_status === 'active' && r.avg_rating > 0 && r.avg_rating < 3.0 && <button className="btn btn-danger btn-sm">Suspend</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
