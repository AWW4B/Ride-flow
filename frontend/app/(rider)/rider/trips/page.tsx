'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function RiderTripsPage() {
  const [trips,   setTrips]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('all');

  useEffect(() => {
    api.rider.getHistory().then(setTrips).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? trips : trips.filter(r => r.status === tab);

  const statusBadge = (s: string) => {
    const map: Record<string,string> = { completed:'success', cancelled:'error', in_progress:'accent', accepted:'warn' };
    return <span className={`badge badge-${map[s] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{s?.replace(/_/g,' ')}</span>;
  };

  const cancelRide = async (id: number) => {
    if (!confirm('Cancel this ride?')) return;
    try { await api.rider.cancelRide(id); setTrips(prev => prev.map(r => r.ride_id === id ? { ...r, status:'cancelled' } : r)); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">My Trips</div><div className="page-subtitle">Your complete ride history</div></div>
      </div>

      <div className="tabs">
        {['all','completed','cancelled','accepted','in_progress'].map(s => (
          <div key={s} className={`tab${tab===s?' active':''}`} onClick={() => setTab(s)}
            style={{ textTransform:'capitalize' }}>{s.replace(/_/g,' ')}</div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading trips…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🚗</div><p>No trips found</p></div>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.ride_id}>
                    <td className="mono">#{r.ride_id}</td>
                    <td className="muted">{r.driver_name ?? '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-s)', maxWidth:200 }}>{r.pickup_address} → {r.dropoff_address}</td>
                    <td style={{ color:'var(--accent)', fontWeight:500 }}>{r.fare > 0 ? `₨${Number(r.fare).toLocaleString()}` : '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td className="muted" style={{ fontSize:11 }}>{r.requested_at?.slice(0,16)}</td>
                    <td>
                      {r.status === 'accepted' && (
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => cancelRide(r.ride_id)}>Cancel</button>
                      )}
                      {r.status === 'completed' && (
                        <button className="btn btn-ghost btn-sm" onClick={async () => {
                          const score = parseInt(prompt('Rate driver (1-5):') ?? '0');
                          if (score >= 1 && score <= 5) {
                            try { await api.rider.rateDriver(r.ride_id, { score }); alert('Rating submitted!'); }
                            catch (e: any) { alert(e.message); }
                          }
                        }}>Rate</button>
                      )}
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
