'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function DriverTripsPage() {
  const [trips,   setTrips]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.driver.getEarnings()
      .then(e => setTrips(e))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: string) => {
    const map: Record<string,string> = { completed:'success', cancelled:'error', in_progress:'accent' };
    return <span className={`badge badge-${map[s] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{s?.replace(/_/g,' ')}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">My Trips</div><div className="page-subtitle">Your complete ride history & earnings</div></div>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading trips…</div>
          ) : trips.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🚗</div><p>No trips yet. Accept a ride to get started!</p></div>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Route</th><th>Gross</th><th>Commission</th><th>Net</th><th>Date</th></tr></thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.earning_id}>
                    <td className="mono">#{t.earning_id}</td>
                    <td className="muted" style={{ fontSize:12 }}>{t.pickup_address} → {t.dropoff_address}</td>
                    <td>₨{Number(t.gross_amount ?? 0).toLocaleString()}</td>
                    <td style={{ color:'var(--danger-fg)' }}>−₨{Number(t.commission_amount ?? 0).toLocaleString()}</td>
                    <td style={{ color:'var(--success-fg)', fontWeight:500 }}>₨{Number(t.net_amount ?? 0).toLocaleString()}</td>
                    <td className="muted" style={{ fontSize:11 }}>{t.credited_at?.slice(0,16)}</td>
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
