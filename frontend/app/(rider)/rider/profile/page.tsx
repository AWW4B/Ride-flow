'use client';
import { useEffect, useState } from 'react';
import { api, loadUser } from '@/utils/api';

export default function RiderProfilePage() {
  const [history, setHistory] = useState<any[]>([]);
  const user = loadUser();

  useEffect(() => {
    api.rider.getHistory().then(setHistory).catch(console.error);
  }, []);

  const completed  = history.filter(r => r.status === 'completed');
  const totalSpent = completed.reduce((s, r) => s + Number(r.fare ?? 0), 0);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">My Profile</div><div className="page-subtitle">Account details and riding statistics</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
            <div className="avatar" style={{ width:54, height:54, fontSize:22 }}>{user?.full_name?.[0] ?? '?'}</div>
            <div>
              <div style={{ fontSize:18, fontWeight:600 }}>{user?.full_name ?? '—'}</div>
              <div style={{ fontSize:13, color:'var(--text-m)' }}>{user?.email ?? '—'}</div>
            </div>
          </div>
          <div className="metric-row"><span className="metric-key">Role</span><span className="badge badge-muted">Rider</span></div>
          <div className="metric-row"><span className="metric-key">Account Status</span><span className="badge badge-success">Active</span></div>
        </div>
        <div className="card">
          <div className="card-title">Ride Statistics</div>
          <div className="metric-row"><span className="metric-key">Total Rides</span><span className="metric-val accent">{history.length}</span></div>
          <div className="metric-row"><span className="metric-key">Completed</span><span className="metric-val">{completed.length}</span></div>
          <div className="metric-row"><span className="metric-key">Cancelled</span><span className="metric-val">{history.filter(r => r.status === 'cancelled').length}</span></div>
          <div className="metric-row"><span className="metric-key">Total Spent</span><span className="metric-val" style={{ color:'var(--accent)' }}>₨{totalSpent.toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );
}
