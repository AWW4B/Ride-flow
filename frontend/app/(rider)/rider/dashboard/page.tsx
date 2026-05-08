'use client';
import { useState, useEffect } from 'react';
import { api, loadUser } from '@/utils/api';

export default function RiderDashboard() {
  const [history,  setHistory]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const user = loadUser();

  useEffect(() => {
    api.rider.getHistory().then(setHistory).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active     = history.filter(r => ['accepted','driver_en_route','in_progress'].includes(r.status));
  const completed  = history.filter(r => r.status === 'completed');
  const totalSpent = completed.reduce((s, r) => s + Number(r.fare ?? 0), 0);

  const statusBadge = (s: string) => {
    const map: Record<string,string> = { completed:'success', cancelled:'error', in_progress:'accent', accepted:'warn', driver_en_route:'warn' };
    return <span className={`badge badge-${map[s] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{s?.replace(/_/g,' ')}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome, {user?.full_name?.split(' ')[0] ?? 'Rider'} 👋</div>
          <div className="page-subtitle">Your ride activity at a glance</div>
        </div>
        <a href="/rider/book" className="btn btn-primary">Book a Ride</a>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">🚗</span>
          <div className="stat-label">Total Rides</div>
          <div className="stat-value accent">{history.length}</div>
          <div className="stat-meta">{completed.length} completed</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💸</span>
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">₨{totalSpent.toLocaleString()}</div>
          <div className="stat-meta">across all rides</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <div className="stat-label">Active Rides</div>
          <div className="stat-value" style={{ color: active.length > 0 ? 'var(--accent)' : 'var(--text-m)' }}>{active.length}</div>
          <div className="stat-meta">currently in progress</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Completed</div>
          <div className="stat-value">{completed.length}</div>
          <div className="stat-meta">successful trips</div>
        </div>
      </div>

      {active.length > 0 && (
        <div className="mb-16" style={{ background:'rgba(196,169,109,0.08)', border:'1px solid rgba(196,169,109,0.25)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:4 }}>
            <span className="live-dot" />Active Ride
          </div>
          {active.map(r => (
            <div key={r.ride_id}>
              <div style={{ fontSize:14, fontWeight:600 }}>Ride #{r.ride_id} — {r.driver_name ?? 'Driver en route'}</div>
              <div style={{ fontSize:12, color:'var(--text-s)' }}>{r.pickup_address} → {r.dropoff_address}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Recent Trips</div>
          <a href="/rider/trips" className="btn btn-ghost btn-sm">All trips →</a>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:32, color:'var(--text-m)' }}>Loading…</div>
        ) : history.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🚗</div><p>No rides yet. Book your first ride!</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th></tr></thead>
              <tbody>
                {history.slice(0, 5).map(r => (
                  <tr key={r.ride_id}>
                    <td className="mono">#{r.ride_id}</td>
                    <td className="muted">{r.driver_name ?? '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-s)', maxWidth:200 }}>{r.pickup_address} → {r.dropoff_address}</td>
                    <td style={{ color:'var(--accent)', fontWeight:500 }}>{r.fare > 0 ? `₨${Number(r.fare).toLocaleString()}` : '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
